import { detectAnomaly } from "./anomaly-detection";

export type RuntimeControlDecisionType = "ALLOW" | "WARN" | "REQUIRE_APPROVAL_ESCALATION" | "BLOCK" | "QUARANTINE";

export interface RuntimeControlDecision {
  allowed: boolean;
  decision: RuntimeControlDecisionType;
  reasons: string[];
  evidence: Record<string, unknown>;
  controlsApplied: string[];
}

const cooldowns = new Map<string, number>();
const executionAttempts = new Map<string, number>();
const rollbackAttempts = new Map<string, number>();
const actorApprovals = new Map<string, { count: number; firstAt: number }>();
const failedJobs = new Map<string, number>();

function cooldownActive(key: string, ms: number) {
  const now = Date.now();
  const last = cooldowns.get(key) ?? 0;
  const active = now - last < ms;
  if (!active) cooldowns.set(key, now);
  return { active, last, now };
}

export function evaluateExecutionRuntimeControls(input: { tenantId: string; actorId?: string; action: string; licenseOrTarget?: string; connectorStatus?: string; recentRollbackRate?: number; anomalySeries?: number[]; cooldownMs?: number; requireEscalation?: boolean }): RuntimeControlDecision {
  const actor = input.actorId ?? "unknown";
  const key = `${input.tenantId}:${input.action}:${actor}:${input.licenseOrTarget ?? "na"}`;
  const attempts = (executionAttempts.get(key) ?? 0) + 1;
  executionAttempts.set(key, attempts);
  const cool = cooldownActive(`execution:${key}`, input.cooldownMs ?? 5_000);
  if (cool.active) return { allowed: false, decision: "BLOCK", reasons: ["EXECUTION_COOLDOWN_ACTIVE"], evidence: { key, attempts, cooldownMs: input.cooldownMs ?? 5_000 }, controlsApplied: ["executionCooldown"] };
  if (input.connectorStatus === "DEGRADED") return { allowed: false, decision: "QUARANTINE", reasons: ["CONNECTOR_DEGRADED"], evidence: { connectorStatus: input.connectorStatus, key }, controlsApplied: ["connectorDegradationQuarantine"] };
  if ((input.recentRollbackRate ?? 0) > 0.5) return { allowed: false, decision: "BLOCK", reasons: ["ROLLBACK_RATE_TOO_HIGH"], evidence: { recentRollbackRate: input.recentRollbackRate }, controlsApplied: ["highRollbackRateBlock"] };
  if (detectAnomaly(input.anomalySeries ?? [])) return { allowed: false, decision: "BLOCK", reasons: ["ANOMALY_TRIGGERED_SUSPENSION"], evidence: { anomalySeries: input.anomalySeries ?? [] }, controlsApplied: ["anomalyTriggeredExecutionSuspension"] };
  if (attempts > 5) return { allowed: false, decision: "WARN", reasons: ["REPEATED_EXECUTION_ATTEMPTS"], evidence: { attempts, key }, controlsApplied: ["repeatedExecutionAttemptDetection"] };
  if (actor.startsWith("svc-") || actor.includes("suspicious")) return { allowed: true, decision: "WARN", reasons: ["SUSPICIOUS_ACTOR_PATTERN"], evidence: { actor }, controlsApplied: ["suspiciousActorDetection"] };
  if (input.requireEscalation) return { allowed: true, decision: "REQUIRE_APPROVAL_ESCALATION", reasons: ["ESCALATION_REQUIRED_BY_RUNTIME_CONTROL"], evidence: { key }, controlsApplied: ["approvalEscalation"] };
  return { allowed: true, decision: "ALLOW", reasons: [], evidence: { key, attempts }, controlsApplied: [] };
}

export function evaluateRollbackRuntimeControls(input: { tenantId: string; actorId?: string; action: string; rollbackCount?: number; anomalySeries?: number[]; cooldownMs?: number }): RuntimeControlDecision {
  const actor = input.actorId ?? "unknown";
  const key = `${input.tenantId}:${input.action}:${actor}`;
  const attempts = (rollbackAttempts.get(key) ?? 0) + 1;
  rollbackAttempts.set(key, attempts);
  const cool = cooldownActive(`rollback:${key}`, input.cooldownMs ?? 5_000);
  if (cool.active) return { allowed: false, decision: "BLOCK", reasons: ["ROLLBACK_COOLDOWN_ACTIVE"], evidence: { key }, controlsApplied: ["rollbackCooldown"] };
  if (detectAnomaly(input.anomalySeries ?? [])) return { allowed: false, decision: "BLOCK", reasons: ["REPEATED_ROLLBACK_ANOMALY"], evidence: { anomalySeries: input.anomalySeries ?? [] }, controlsApplied: ["repeatedRollbackAnomaly"] };
  if ((input.rollbackCount ?? 0) > 10 || attempts > 4) return { allowed: false, decision: "BLOCK", reasons: ["ROLLBACK_SPIKE_DETECTED"], evidence: { rollbackCount: input.rollbackCount ?? 0, attempts }, controlsApplied: ["rollbackSpikeDetection"] };
  if (actor.includes("suspicious")) return { allowed: true, decision: "WARN", reasons: ["ROLLBACK_ACTOR_ANOMALY"], evidence: { actor }, controlsApplied: ["actorAnomaly"] };
  return { allowed: true, decision: "ALLOW", reasons: [], evidence: { key, attempts }, controlsApplied: [] };
}

export function evaluateApprovalRuntimeControls(input: { tenantId: string; actorId: string; riskClass?: string; action?: string }): RuntimeControlDecision {
  const key = `${input.tenantId}:${input.actorId}`;
  const now = Date.now();
  const state = actorApprovals.get(key) ?? { count: 0, firstAt: now };
  state.count += 1;
  actorApprovals.set(key, state);
  const velocityPerMin = state.count / Math.max((now - state.firstAt) / 60000, 1);
  if (state.count > 20 || velocityPerMin > 10 || (input.riskClass === "B" && state.count > 10)) {
    return { allowed: true, decision: "REQUIRE_APPROVAL_ESCALATION", reasons: ["SUSPICIOUS_APPROVAL_DETECTED"], evidence: { count: state.count, velocityPerMin, riskClass: input.riskClass ?? "B", action: input.action ?? "REMOVE_LICENSE" }, controlsApplied: ["approvalVelocity", "repeatedApprovalsBySameActor"] };
  }
  return { allowed: true, decision: "ALLOW", reasons: [], evidence: { count: state.count, velocityPerMin }, controlsApplied: [] };
}

export function evaluateJobRuntimeControls(input: { tenantId: string; jobType: string; failedCount?: number; connectorStatus?: string; duplicateRunning?: boolean }): RuntimeControlDecision {
  const key = `${input.tenantId}:${input.jobType}`;
  const knownFailed = Math.max(input.failedCount ?? 0, failedJobs.get(key) ?? 0);
  if (input.duplicateRunning) return { allowed: true, decision: "WARN", reasons: ["DUPLICATE_JOB_SKIPPED"], evidence: { key }, controlsApplied: ["concurrentDuplicateJobGuard"] };
  if (input.connectorStatus === "DEGRADED" && input.jobType.includes("connector")) return { allowed: false, decision: "QUARANTINE", reasons: ["CONNECTOR_DEGRADED"], evidence: { key }, controlsApplied: ["connectorDegradedQuarantine"] };
  if (knownFailed >= 5) return { allowed: false, decision: "QUARANTINE", reasons: ["REPEATED_FAILED_JOB_STORM"], evidence: { key, failedCount: knownFailed }, controlsApplied: ["deadLetterRepeatedFailingJobs"] };
  return { allowed: true, decision: "ALLOW", reasons: [], evidence: { key, failedCount: knownFailed }, controlsApplied: [] };
}

export function trackJobFailure(tenantId: string, jobType: string) {
  const key = `${tenantId}:${jobType}`;
  failedJobs.set(key, (failedJobs.get(key) ?? 0) + 1);
}
