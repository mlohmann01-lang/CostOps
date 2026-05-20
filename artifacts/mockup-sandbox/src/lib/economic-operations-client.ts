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

export type TenantOperationalMode = "DEMO" | "PILOT_READ_ONLY" | "PILOT_APPROVAL_REQUIRED" | "PRODUCTION_RECOMMEND_ONLY" | "PRODUCTION_APPROVAL_REQUIRED" | "PRODUCTION_GOVERNED_EXECUTION" | "PRODUCTION_LOCKED";
export const TENANT_OPERATIONAL_MODE_REGISTRY: Record<TenantOperationalMode, { label: string; uiBanner: string; allowsFixtureFallback: boolean; allowsLiveExecution: boolean }> = {
  DEMO: { label: "DEMO MODE", uiBanner: "DEMO MODE — fixture-backed, no live execution", allowsFixtureFallback: true, allowsLiveExecution: false },
  PILOT_READ_ONLY: { label: "PILOT READ-ONLY", uiBanner: "PILOT READ-ONLY — real evidence, no live mutation", allowsFixtureFallback: false, allowsLiveExecution: false },
  PILOT_APPROVAL_REQUIRED: { label: "PILOT APPROVAL REQUIRED", uiBanner: "PILOT APPROVAL REQUIRED — controlled execution", allowsFixtureFallback: false, allowsLiveExecution: true },
  PRODUCTION_RECOMMEND_ONLY: { label: "PRODUCTION RECOMMEND-ONLY", uiBanner: "PRODUCTION RECOMMEND-ONLY — no execution permitted", allowsFixtureFallback: false, allowsLiveExecution: false },
  PRODUCTION_APPROVAL_REQUIRED: { label: "PRODUCTION APPROVAL REQUIRED", uiBanner: "PRODUCTION APPROVAL REQUIRED — live execution gated by approval", allowsFixtureFallback: false, allowsLiveExecution: true },
  PRODUCTION_GOVERNED_EXECUTION: { label: "PRODUCTION GOVERNED EXECUTION", uiBanner: "PRODUCTION GOVERNED EXECUTION — live governed execution", allowsFixtureFallback: false, allowsLiveExecution: true },
  PRODUCTION_LOCKED: { label: "PRODUCTION LOCKED", uiBanner: "PRODUCTION LOCKED — no execution permitted", allowsFixtureFallback: false, allowsLiveExecution: false },
};

export type TimelineDto = { id: string; events: Array<{ id: string; label: string; state: string; at: string; detail: string }> };
export type ProofType = "SOURCE_EVIDENCE" | "CONNECTOR_EVIDENCE" | "TRUST_SCORING" | "SAVINGS_CALCULATION" | "SIMULATION_RESULT" | "APPROVAL_DECISION" | "EXECUTION_DECISION" | "VERIFICATION_RESULT" | "OUTCOME_LEDGER_ENTRY" | "ROLLBACK_PLAN" | "DRIFT_EVENT" | "PROOF_INCOMPLETE";
export type ProofGraphNodeDto = { proofId: string; proofType: ProofType; title: string; summary: string; source: string; timestamp: string; confidence: number; upstreamProofIds: string[]; downstreamProofIds: string[]; evidenceHash?: string; displayPriority: number; expandableDetails: string; environment: "DEMO"|"PILOT"|"PRODUCTION"; isFixtureBacked: boolean; sourceOfTruth: "FIXTURE"|"CONNECTOR"|"LEDGER"|"SIMULATION"; };
export type ProofGraphDto = { executionId: string; nodes: ProofGraphNodeDto[]; collapsedByDefault: boolean; warning?: "PROOF_INCOMPLETE" };
export type RollbackDto = { id: string; deadline: string; blockers: string[]; notes: string };
export type ReplayDto = { id: string; before: string; after: string; propagation: string; risk: string; rollbackPlan: string };
export type OutcomeLedgerSummaryDto = { executionId: string; projectedMonthlySaving: number; projectedAnnualSaving: number; verifiedMonthlySaving: number | null; verifiedAnnualSaving: number | null; savingConfidence: number; approvalProvenance: string; executionStatus: string; verificationStatus: string; rollbackStatus: string; driftRecurrenceStatus: string; evidenceCompleteness: string; outcomeTimestamp: string | null; ledgerEnvironment: "DEMO"|"PILOT"|"PRODUCTION"; isFixtureBacked: boolean; isVerifiedSaving: boolean; sourceOfTruth: "FIXTURE"|"CONNECTOR"|"LEDGER"|"SIMULATION"; };
export type ActionHistoryEntryDto = { action: string; actor: string; actorRole: string; sourceSurface: string; reason: string; result: string; previousState: string; nextState: string; timestamp: string; proofIds: string[]; ledgerEntryId: string | null; idempotencyKey: string };
export type ActionHistoryDto = { executionId: string; actions: ActionHistoryEntryDto[] };

export const EXECUTION_INTENTS = ["SIMULATE", "REQUEST_APPROVAL", "APPROVE", "REJECT", "EXECUTE", "ROLLBACK", "ESCALATE", "QUARANTINE", "MARK_MANUAL_ONLY", "REQUEST_MORE_EVIDENCE", "ACKNOWLEDGE_DRIFT"] as const;
export type ExecutionIntentType = (typeof EXECUTION_INTENTS)[number];
export type SourceSurface = "UI" | "MCP" | "API" | "SYSTEM";
export type ExecutionIntentDto = { tenantId: string; executionId: string; actorId: string; actorRole: string; intentType: ExecutionIntentType; sourceSurface: SourceSurface; timestamp: string; reason: string; requiredProofIds: string[]; expectedStateTransition: { from: OperationalState; to: OperationalState }; idempotencyKey: string };
export type IntentResultState = "INTENT_ACCEPTED" | "INTENT_REJECTED" | "INTENT_DUPLICATE" | "INTENT_BLOCKED_BY_POLICY" | "INTENT_BLOCKED_BY_APPROVAL" | "INTENT_BLOCKED_BY_CONNECTOR" | "INTENT_BLOCKED_BY_DATA_TRUST" | "INTENT_BLOCKED_BY_SIMULATION" | "INTENT_BLOCKED_BY_ROLLBACK";
export type ExecutionIntentResultDto = { accepted: boolean; rejected: boolean; reason: IntentResultState; previousState: OperationalState; nextState: OperationalState; proofIds: string[]; ledgerEntryId: string | null; idempotencyKey: string; timestamp: string };

const previewMode = import.meta.env.VITE_ECONOMIC_OPS_PREVIEW_MODE === "true";
const tenantMode = (import.meta.env.VITE_ECONOMIC_OPS_TENANT_MODE ?? "DEMO") as TenantOperationalMode;
const pilotScenario = import.meta.env.VITE_ECONOMIC_OPS_PILOT_SCENARIO ?? "";
const tenantId = import.meta.env.VITE_TENANT_ID ?? "TENANT-US";
const baseUrl = import.meta.env.VITE_ECONOMIC_OPERATIONS_API_BASE ?? "";

export function isEconomicOpsPreviewMode(): boolean { return previewMode; }
export function getEconomicOpsPilotScenario(): string { return pilotScenario; }
export function getEconomicOpsTenantMode(): TenantOperationalMode { return tenantMode; }

export function toOperationalState(raw: string): OperationalState {
  const normalized = raw?.toUpperCase().trim();
  return (OPERATIONAL_STATES as readonly string[]).includes(normalized) ? (normalized as OperationalState) : "MANUAL_ONLY";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const res = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal, headers: { "x-tenant-id": tenantId, "content-type": "application/json", ...(init?.headers ?? {}) } });
  clearTimeout(timer);
  if (!res.ok) throw normalizeError(res.status, await res.text());
  return (await res.json()) as T;
}

function normalizeError(status: number, body: string): OpsApiError { return { status, code: `HTTP_${status}`, message: body || "Economic operations request failed" }; }

const m365PilotFixture: CommandCenterDto = {
  executions: [{ id: "m365-disabled-user-reclaim-001", title: "M365 Optimization & Governance · Disabled Licensed User Reclaim", impact: "$57 monthly / $684 annual projected savings", action: "Simulate and request approval for disabled E5 user licence reclaim", state: "SIMULATION_REQUIRED", tenantId: "TENANT-US", provider: "Microsoft 365", approvalRequired: true }],
  connectors: [{ id: "m365-graph", name: "Microsoft Graph (read-only)", state: "HEALTHY", tenantId: "TENANT-US" }],
  approvals: [{ id: "m365-approval-1", title: "Reclaim Microsoft 365 E5 for disabled user", state: "APPROVAL_REQUIRED", tenantId: "TENANT-US" }],
  health: [{ label: "Latest evidence sync", value: "Synced 6 minutes ago · identity + licence + activity evidence complete", state: "GOVERNED_EXECUTION_ELIGIBLE" }],
  tenantPosture: [{ tenantId: "TENANT-US", state: "GOVERNED_EXECUTION_ELIGIBLE", note: "Acme Retail Group · pilot scenario m365-disabled-user-reclaim" }],
};

function requirePreviewFallback<T>(fallback: T, error: unknown): T {
  if (previewMode && tenantMode === "DEMO" && pilotScenario === "m365-disabled-user-reclaim") return fallback;
  throw error;
}

export const economicOperationsClient = {
  tenantId,
  async getCommandCenter(): Promise<CommandCenterDto> { try { return await request<CommandCenterDto>(`/economic-operations/command-center?tenantId=${encodeURIComponent(tenantId)}`); } catch (error) { return requirePreviewFallback(m365PilotFixture, error); } },
  async getTimeline(id: string): Promise<TimelineDto> { return request<TimelineDto>(`/economic-operations/timeline/${id}?tenantId=${encodeURIComponent(tenantId)}`); },
  async getProofGraph(id: string): Promise<ProofGraphDto> { return request<ProofGraphDto>(`/economic-operations/proof/${id}?tenantId=${encodeURIComponent(tenantId)}`); },
  getRollback: (id: string) => request<RollbackDto>(`/economic-operations/rollback/${id}?tenantId=${encodeURIComponent(tenantId)}`),
  getReplay: (id: string) => request<ReplayDto>(`/economic-operations/replay/${id}?tenantId=${encodeURIComponent(tenantId)}`),
  async getOutcomeLedgerSummary(id: string): Promise<OutcomeLedgerSummaryDto> { return request<OutcomeLedgerSummaryDto>(`/economic-operations/outcomes/${id}?tenantId=${encodeURIComponent(tenantId)}`); },
  getActionHistory: (executionId: string) => request<ActionHistoryDto>(`/economic-operations/actions/${executionId}?tenantId=${encodeURIComponent(tenantId)}`),
  submitExecutionIntent: (intent: ExecutionIntentDto) => request<ExecutionIntentResultDto>("/economic-operations/intent", { method: "POST", body: JSON.stringify(intent) }),
};
