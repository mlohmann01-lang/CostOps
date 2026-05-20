import { OPERATIONAL_STATES, type OperationalState } from "@/lib/ops-state";

export type OpsApiError = { message: string; status: number; code: string };
export type ConnectorState = "HEALTHY" | "DEGRADED" | "OFFLINE";

export type CommandCenterItemDto = {
  id: string;
  title: string;
  impact: string;
  action: string;
  state: string;
  tenantId: string;
  provider: string;
  approvalRequired: boolean;
};

export type CommandCenterDto = {
  executions: CommandCenterItemDto[];
  connectors: Array<{ id: string; name: string; state: ConnectorState; tenantId: string }>;
  approvals: Array<{ id: string; title: string; state: string; tenantId: string }>;
  health: Array<{ label: string; value: string; state: string }>;
  tenantPosture: Array<{ tenantId: string; state: string; note: string }>;
};

export type TimelineDto = { id: string; events: Array<{ id: string; label: string; state: string; at: string; detail: string }> };
export type ProofDto = { id: string; title: string; summary: string; details: string };
export type ProofType = "SOURCE_EVIDENCE" | "CONNECTOR_EVIDENCE" | "TRUST_SCORING" | "SAVINGS_CALCULATION" | "SIMULATION_RESULT" | "APPROVAL_DECISION" | "EXECUTION_DECISION" | "VERIFICATION_RESULT" | "OUTCOME_LEDGER_ENTRY" | "ROLLBACK_PLAN" | "DRIFT_EVENT" | "PROOF_INCOMPLETE";
export type ProofGraphNodeDto = { proofId: string; proofType: ProofType; title: string; summary: string; source: string; timestamp: string; confidence: number; upstreamProofIds: string[]; downstreamProofIds: string[]; evidenceHash?: string; displayPriority: number; expandableDetails: string };
export type ProofGraphDto = { executionId: string; nodes: ProofGraphNodeDto[]; collapsedByDefault: boolean; warning?: "PROOF_INCOMPLETE" };
export type RollbackDto = { id: string; deadline: string; blockers: string[]; notes: string };
export type ReplayDto = { id: string; before: string; after: string; propagation: string; risk: string; rollbackPlan: string };
export type OutcomeLedgerSummaryDto = { executionId: string; projectedMonthlySaving: number; projectedAnnualSaving: number; verifiedMonthlySaving: number | null; verifiedAnnualSaving: number | null; savingConfidence: number; approvalProvenance: string; executionStatus: string; verificationStatus: string; rollbackStatus: string; driftRecurrenceStatus: string; evidenceCompleteness: string; outcomeTimestamp: string | null };

export const EXECUTION_INTENTS = ["SIMULATE", "REQUEST_APPROVAL", "APPROVE", "REJECT", "EXECUTE", "ROLLBACK", "ESCALATE", "QUARANTINE", "MARK_MANUAL_ONLY", "REQUEST_MORE_EVIDENCE", "ACKNOWLEDGE_DRIFT"] as const;
export type ExecutionIntentType = (typeof EXECUTION_INTENTS)[number];
export type SourceSurface = "UI" | "MCP" | "API" | "SYSTEM";
export type ExecutionIntentDto = { tenantId: string; executionId: string; actorId: string; actorRole: string; intentType: ExecutionIntentType; sourceSurface: SourceSurface; timestamp: string; reason: string; requiredProofIds: string[]; expectedStateTransition: { from: OperationalState; to: OperationalState }; idempotencyKey: string };
export type IntentResultState = "INTENT_ACCEPTED" | "INTENT_REJECTED" | "INTENT_DUPLICATE" | "INTENT_BLOCKED_BY_POLICY" | "INTENT_BLOCKED_BY_APPROVAL" | "INTENT_BLOCKED_BY_CONNECTOR" | "INTENT_BLOCKED_BY_DATA_TRUST" | "INTENT_BLOCKED_BY_SIMULATION" | "INTENT_BLOCKED_BY_ROLLBACK";
export type ExecutionIntentResultDto = { accepted: boolean; rejected: boolean; reason: IntentResultState; previousState: OperationalState; nextState: OperationalState; proofIds: string[]; ledgerEntryId: string | null; idempotencyKey: string; timestamp: string };

const idempotencyRegistry = new Set<string>();

const isPreview = import.meta.env.MODE !== "production";
const baseUrl = import.meta.env.VITE_ECONOMIC_OPERATIONS_API_BASE ?? "";

export function toOperationalState(raw: string): OperationalState {
  const normalized = raw?.toUpperCase().trim();
  return (OPERATIONAL_STATES as readonly string[]).includes(normalized)
    ? (normalized as OperationalState)
    : "MANUAL_ONLY";
}

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const res = await fetch(`${baseUrl}${path}`, { signal: controller.signal, headers: { "x-tenant-id": "TENANT-US" } });
  clearTimeout(timer);
  if (!res.ok) {
    throw normalizeError(res.status, await res.text());
  }
  return (await res.json()) as T;
}

function normalizeError(status: number, body: string): OpsApiError {
  return { status, code: `HTTP_${status}`, message: body || "Economic operations request failed" };
}

function validateIntent(intent: ExecutionIntentDto, currentState: OperationalState): { ok: true } | { ok: false; reason: IntentResultState } {
  if (idempotencyRegistry.has(intent.idempotencyKey)) return { ok: false, reason: "INTENT_DUPLICATE" };
  const validState = OPERATIONAL_STATES.includes(currentState);
  if (!validState) return { ok: false, reason: "INTENT_REJECTED" };
  if (intent.expectedStateTransition.from !== currentState) return { ok: false, reason: "INTENT_REJECTED" };
  if (currentState === "APPROVAL_REQUIRED" && !["APPROVE", "REJECT", "REQUEST_MORE_EVIDENCE", "ESCALATE"].includes(intent.intentType)) return { ok: false, reason: "INTENT_BLOCKED_BY_APPROVAL" };
  if (currentState === "CONNECTOR_BLOCKED" && intent.intentType === "EXECUTE") return { ok: false, reason: "INTENT_BLOCKED_BY_CONNECTOR" };
  if (currentState === "DATA_TRUST_INSUFFICIENT" && intent.intentType === "EXECUTE") return { ok: false, reason: "INTENT_BLOCKED_BY_DATA_TRUST" };
  if (currentState === "SIMULATION_REQUIRED" && intent.intentType === "EXECUTE") return { ok: false, reason: "INTENT_BLOCKED_BY_SIMULATION" };
  if (currentState === "ROLLBACK_REQUIRED" && intent.intentType !== "ROLLBACK") return { ok: false, reason: "INTENT_BLOCKED_BY_ROLLBACK" };
  idempotencyRegistry.add(intent.idempotencyKey);
  return { ok: true };
}

const fixture: CommandCenterDto = {
  executions: [
    { id: "m365-1", title: "M365 license deprovisioning opportunity", impact: "$118,200 annualized savings", action: "Approve staged execution for 410 inactive seats", state: "APPROVAL_REQUIRED", tenantId: "TENANT-US", provider: "M365", approvalRequired: true },
    { id: "m365-2", title: "Execution batch #8022", impact: "71% propagated", action: "Wait for provider settlement window", state: "VERIFICATION_PENDING", tenantId: "TENANT-US", provider: "M365", approvalRequired: false },
  ],
  connectors: [{ id: "c1", name: "M365 Graph", state: "DEGRADED", tenantId: "TENANT-US" }],
  approvals: [{ id: "a1", title: "Seat deprovision wave 2", state: "APPROVAL_REQUIRED", tenantId: "TENANT-US" }],
  health: [{ label: "Rollback blockers", value: "1 deadline inside 6 hours", state: "ROLLBACK_REQUIRED" }],
  tenantPosture: [{ tenantId: "TENANT-US", state: "MANUAL_ONLY", note: "Read-only tenant mode active" }],
};

export const economicOperationsClient = {
  async getCommandCenter(): Promise<CommandCenterDto> {
    try { return await request<CommandCenterDto>("/economic-operations/command-center"); } catch (error) { if (isPreview) return fixture; throw error; }
  },
  async getTimeline(id: string): Promise<TimelineDto> {
    try { return await request<TimelineDto>(`/economic-operations/timeline/${id}`); } catch (error) { if (isPreview) return { id, events: [{ id: "evt-1", label: "Ledger write queued", state: "VERIFICATION_PENDING", at: new Date().toISOString(), detail: "Outcome ledger write pending verification." }] }; throw error; }
  },
  getProof: (id: string) => request<ProofDto>(`/economic-operations/proof/${id}`),
  async getProofGraph(id: string): Promise<ProofGraphDto> {
    try { return await request<ProofGraphDto>(`/economic-operations/proof-graph/${id}`); } catch (error) { if (isPreview) return { executionId: id, collapsedByDefault: true, warning: "PROOF_INCOMPLETE", nodes: [{ proofId: "p1", proofType: "SAVINGS_CALCULATION", title: "Savings evidence", summary: "Invoice delta", source: "M365", timestamp: new Date().toISOString(), confidence: 0.84, upstreamProofIds: [], downstreamProofIds: ["p2"], displayPriority: 1, expandableDetails: "Projected and partial verified savings." }] }; throw error; }
  },
  getRollback: (id: string) => request<RollbackDto>(`/economic-operations/rollback/${id}`),
  getReplay: (id: string) => request<ReplayDto>(`/economic-operations/replay/${id}`),
  async getOutcomeLedgerSummary(id: string): Promise<OutcomeLedgerSummaryDto> {
    try { return await request<OutcomeLedgerSummaryDto>(`/economic-operations/outcome-ledger/${id}`); } catch (error) { if (isPreview) return { executionId: id, projectedMonthlySaving: 9850, projectedAnnualSaving: 118200, verifiedMonthlySaving: null, verifiedAnnualSaving: null, savingConfidence: 0.84, approvalProvenance: "ECON-42", executionStatus: "EXECUTION_IN_PROGRESS", verificationStatus: "VERIFICATION_PENDING", rollbackStatus: "ROLLBACK_AVAILABLE", driftRecurrenceStatus: "MONITORED", evidenceCompleteness: "PARTIAL", outcomeTimestamp: null }; throw error; }
  },
  async submitExecutionIntent(intent: ExecutionIntentDto): Promise<ExecutionIntentResultDto> {
    const verdict = validateIntent(intent, intent.expectedStateTransition.from);
    return verdict.ok
      ? { accepted: true, rejected: false, reason: "INTENT_ACCEPTED", previousState: intent.expectedStateTransition.from, nextState: intent.expectedStateTransition.to, proofIds: intent.requiredProofIds, ledgerEntryId: `ledger-${intent.executionId}`, idempotencyKey: intent.idempotencyKey, timestamp: new Date().toISOString() }
      : { accepted: false, rejected: true, reason: verdict.reason, previousState: intent.expectedStateTransition.from, nextState: intent.expectedStateTransition.from, proofIds: intent.requiredProofIds, ledgerEntryId: null, idempotencyKey: intent.idempotencyKey, timestamp: new Date().toISOString() };
  },
};
