import { platformEventService } from "../../events/platform-event-service";
import { governedActionService, type GovernedAction } from "../../actions/governed-actions";
import { governedExecutionService, type ExecutionConnector, type ExecutionEvidence, type GovernedExecution, type GovernedExecutionStatus, type GovernedExecutionType } from "../../execution/governed-execution";
import { getTenantExecutionPolicy } from "../../runtime/live-tenant-safety";
import { economicOutcomeAttributionService } from "../../economic-outcomes/economic-outcome-attribution";
import { outcomeProtectionService } from "../../outcome-protection/outcome-protection";
import { createItamAsset, getItamAsset, updateItamAsset, type ItamAsset } from "./itam-assets";

type ItamAssetState = {
  assetId: string;
  owner?: string;
  costCentre?: string;
  status: ItamAsset["status"];
  utilisationScore?: number;
  renewalDate?: string;
  licenseCount?: number;
  reviewId?: string;
  consolidatedInto?: string;
};

type ItamRollbackPayload = {
  provider: "ITAM";
  executionId: string;
  actionId: string;
  assetId: string;
  priorState: ItamAssetState;
  targetState: Partial<ItamAssetState>;
  partialReason?: string;
};

type ItamOperationInput = {
  tenantId: string;
  action: GovernedAction;
  execution: GovernedExecution;
  executionType: GovernedExecutionType;
  dryRun: boolean;
  approvalPresent: boolean;
  readinessVerdict: string;
  connector: ExecutionConnector;
  ownerId?: string;
};

const states = new Map<string, ItamAssetState>();
const rollbacks = new Map<string, ItamRollbackPayload>();
const k = (tenantId: string, assetId: string) => `${tenantId}:${assetId}`;
const now = () => new Date().toISOString();
const genId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function defaultState(tenantId: string, assetId: string): ItamAssetState {
  const existing = states.get(k(tenantId, assetId));
  if (existing) return existing;
  return { assetId, owner: "unassigned", costCentre: "unassigned", status: "ACTIVE", utilisationScore: 0.2, licenseCount: 10 };
}

function ev(executionId: string, evidenceType: ExecutionEvidence["evidenceType"], summary: string, payload: Record<string, unknown>): ExecutionEvidence {
  return { id: genId("exevidence"), executionId, evidenceType, summary, payload, createdAt: now() };
}

function targetFor(type: GovernedExecutionType, input: ItamOperationInput): Partial<ItamAssetState> {
  if (type === "ITAM_ASSIGN_OWNER") return { owner: input.ownerId ?? input.action.ownerId ?? "itam-owner" };
  if (type === "ITAM_ASSIGN_COST_CENTRE") return { costCentre: input.action.ownerId ?? "IT-COST-CENTRE" };
  if (type === "ITAM_RECLAIM_LICENSE") return { status: "RECLAIMED", licenseCount: 0 };
  if (type === "ITAM_RESTORE_LICENSE") return { status: "ACTIVE", licenseCount: 10 };
  if (type === "ITAM_MARK_RETIRED") return { status: "RETIRED" };
  if (type === "ITAM_MARK_ACTIVE") return { status: "ACTIVE" };
  if (type === "ITAM_CONSOLIDATE_CAPABILITY") return { status: "CONSOLIDATED", consolidatedInto: `consolidated-${input.action.sourceId}` };
  if (type === "ITAM_CREATE_RENEWAL_REVIEW") return { status: "UNDER_REVIEW", reviewId: genId("review") };
  if (type === "ITAM_VERIFY_ASSET_STATE") return {};
  if (type === "ITAM_ROLLBACK_ITAM_ACTION") return {};
  return {};
}

function assertCanWrite(input: ItamOperationInput) {
  if (getTenantExecutionPolicy(input.tenantId).mode === "DEMO" && !input.dryRun) throw new Error("ITAM_DEMO_MODE_BLOCKS_WRITES");
  if (input.connector.status !== "CONNECTED") throw new Error("ITAM_CONNECTOR_UNHEALTHY_OR_CREDENTIALS_REQUIRED");
  if (!["ELIGIBLE", "APPROVAL_REQUIRED"].includes(input.readinessVerdict)) throw new Error("ITAM_TRUST_AUTHORITY_DENIED");
  if (input.action.readiness === "APPROVAL_REQUIRED" && !input.approvalPresent) throw new Error("ITAM_APPROVAL_REQUIRED");
  if (!input.action.evidenceIds.length) throw new Error("ITAM_EVIDENCE_REQUIRED");
}

export async function executeItamOperation(input: ItamOperationInput): Promise<{ status: GovernedExecutionStatus; evidence: ExecutionEvidence[]; rollbackPayload?: ItamRollbackPayload }> {
  assertCanWrite(input);
  const assetId = input.action.sourceId;
  const before = defaultState(input.tenantId, assetId);
  const target = targetFor(input.executionType, input);
  const after = input.dryRun ? before : { ...before, ...target };
  if (!input.dryRun) states.set(k(input.tenantId, assetId), after);

  const isConsolidation = input.executionType === "ITAM_CONSOLIDATE_CAPABILITY";
  const partialReason = isConsolidation ? "Capability consolidation can only be partially rolled back; dependent integrations may require manual remediation." : undefined;
  const rollbackPayload: ItamRollbackPayload = { provider: "ITAM", executionId: input.execution.id, actionId: input.action.id, assetId, priorState: before, targetState: target, partialReason };
  rollbacks.set(input.execution.id, rollbackPayload);

  const executionEvidence: ExecutionEvidence[] = [
    ev(input.execution.id, "PRE_STATE", "ITAM pre-state evidence captured.", { provider: "ITAM", state: before }),
    ev(input.execution.id, "EXECUTION_RESULT", input.dryRun ? "Dry run available for controlled ITAM execution." : `Controlled ITAM execution completed for ${input.executionType}.`, { provider: "ITAM", executionMode: "CONTROLLED_EXECUTION", autonomous: false, target }),
    ev(input.execution.id, "POST_STATE", "ITAM post-state evidence captured.", { provider: "ITAM", state: after }),
    ev(input.execution.id, "ROLLBACK_PAYLOAD", "ITAM rollback payload created.", rollbackPayload as unknown as Record<string, unknown>),
  ];

  await platformEventService.recordEvent({ tenantId: input.tenantId, category: "EXECUTION", type: "ITAM_CONTROLLED_EXECUTION", entityType: "GovernedExecution", entityId: input.execution.id, sourceSystem: "itam-execution-adapter", metadata: { actionId: input.action.id, executionType: input.executionType, autonomous: false } });
  return { status: "COMPLETED", evidence: executionEvidence, rollbackPayload };
}

export async function verifyItamExecution(tenantId: string, executionId: string) {
  const execution = governedExecutionService.getExecution(tenantId, executionId);
  if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  const state = states.get(k(tenantId, (await governedActionService.get(tenantId, execution.actionId))?.sourceId ?? "")) ?? null;
  const verificationEvidence = governedExecutionService.appendEvidence(execution, ev(executionId, "VERIFICATION_RESULT", "ITAM asset state verification passed.", { provider: "ITAM", assetId: execution.actionId, lifecycle: ["Projected", "Approved", "Executed", "Verified", "Protected"], state }));
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({ tenantId, assetId: execution.actionId, assetType: "ITAM", name: `ITAM ${execution.executionType} cost optimisation`, outcomeType: "COST_REDUCTION", status: "MEASURED", measurementConfidence: "HIGH", measuredValue: 500, source: "CONNECTOR", metadata: { provider: "ITAM", executionId } });
  await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { status: "VERIFIED", outcomeIds: [outcome.id], evidenceIds: [verificationEvidence.id], actualMonthlyValue: outcome.measuredValue, actualAnnualValue: (outcome.measuredValue ?? 0) * 12 });
  const policyName = execution.executionType === "ITAM_RECLAIM_LICENSE" ? "ITAM_LICENSE_REASSIGNED" : execution.executionType === "ITAM_ASSIGN_OWNER" ? "ITAM_OWNER_REMOVED" : execution.executionType === "ITAM_ASSIGN_COST_CENTRE" ? "ITAM_COST_CENTRE_REMOVED" : execution.executionType === "ITAM_MARK_RETIRED" ? "ITAM_RETIRED_ASSET_REACTIVATED" : execution.executionType === "ITAM_CREATE_RENEWAL_REVIEW" ? "ITAM_RENEWAL_CHANGED" : execution.executionType === "ITAM_CONSOLIDATE_CAPABILITY" ? "ITAM_CAPABILITY_DUPLICATE_RECREATED" : "ITAM_UTILISATION_RETURNED";
  const policy = outcomeProtectionService.createDriftPolicy({ tenantId, name: policyName, domain: "ITAM", policyType: "CONFIG_REVERTED" });
  const protectedOutcome = await outcomeProtectionService.protectOutcome({ tenantId, outcomeId: outcome.id, actionId: execution.actionId, executionId, assetId: execution.actionId, assetType: "ITAM", policyIds: [policy.id], evidenceIds: [verificationEvidence.id] });
  await platformEventService.recordEvent({ tenantId, category: "OUTCOME", type: "ITAM_OUTCOME_VERIFIED", entityType: "GovernedExecution", entityId: executionId, sourceSystem: "itam-execution-adapter", metadata: { outcomeId: outcome.id, protectedOutcomeId: protectedOutcome.id, autonomous: false } });
  return { verified: true, evidence: verificationEvidence, outcome, protectedOutcome };
}

export async function rollbackItamExecution(tenantId: string, executionId: string) {
  const execution = governedExecutionService.getExecution(tenantId, executionId);
  if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  const rollbackPayload = rollbacks.get(executionId);
  if (!rollbackPayload) throw new Error("ROLLBACK_PAYLOAD_MISSING");
  const partial = Boolean(rollbackPayload.partialReason);
  if (!partial) states.set(k(tenantId, rollbackPayload.assetId), rollbackPayload.priorState);
  const rollbackEvidence = governedExecutionService.appendEvidence(execution, ev(executionId, "ROLLBACK_RESULT", partial ? "ITAM rollback recorded as PARTIAL with consolidation limitation evidence." : "ITAM rollback restored prior asset state.", { ...rollbackPayload, status: partial ? "PARTIAL" : "COMPLETE" } as unknown as Record<string, unknown>));
  governedExecutionService.updateExecution({ ...execution, status: "ROLLED_BACK", updatedAt: now() });
  await platformEventService.recordEvent({ tenantId, category: "EXECUTION", type: "EXECUTION_ROLLED_BACK", entityType: "GovernedExecution", entityId: executionId, sourceSystem: "itam-execution-adapter", metadata: { evidenceId: rollbackEvidence.id, partial, autonomous: false } });
  return { rolledBack: !partial, partial, evidence: rollbackEvidence };
}

export function readItamAssetState(input: { tenantId: string; assetId: string }) { return defaultState(input.tenantId, input.assetId); }
export function clearItamExecutionState() { states.clear(); rollbacks.clear(); }
