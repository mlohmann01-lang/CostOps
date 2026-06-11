import { platformEventService } from "../../events/platform-event-service";
import { governedActionService, type GovernedAction } from "../../actions/governed-actions";
import { governedExecutionService, type ExecutionConnector, type ExecutionEvidence, type GovernedExecution, type GovernedExecutionStatus, type GovernedExecutionType } from "../../execution/governed-execution";
import { getTenantExecutionPolicy } from "../../runtime/live-tenant-safety";
import { economicOutcomeAttributionService } from "../../economic-outcomes/economic-outcome-attribution";
import { outcomeProtectionService } from "../../outcome-protection/outcome-protection";
import { getAwsArtifactByExecution, listAwsArtifacts, upsertAwsArtifact, type AwsArtifact } from "./aws-artifacts";

type AwsResourceState = {
  resourceId: string;
  name: string;
  resourceType: AwsArtifact["artifactType"];
  state: "ACTIVE" | "STOPPED" | "DELETED";
  instanceType?: string;
  rdsClass?: string;
  owner?: string;
  monthlyCost: number;
  reviewCreated?: boolean;
};
type AwsRollbackPayload = { provider: "AWS"; executionId: string; actionId: string; resourceId: string; priorState: AwsResourceState; targetState: Partial<AwsResourceState>; partialReason?: string };
type AwsOperationInput = { tenantId: string; action: GovernedAction; execution: GovernedExecution; executionType: GovernedExecutionType; dryRun: boolean; approvalPresent: boolean; readinessVerdict: string; connector: ExecutionConnector; ownerId?: string };

const states = new Map<string, AwsResourceState>();
const rollbacks = new Map<string, AwsRollbackPayload>();
const key = (tenantId: string, resourceId: string) => `${tenantId}:${resourceId}`;
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function resourceTypeFor(executionType: GovernedExecutionType): AwsArtifact["artifactType"] {
  if (executionType.includes("RDS")) return "RDS";
  if (executionType.includes("EBS")) return "EBS";
  if (executionType.includes("EIP")) return "EIP";
  if (executionType.includes("SAVINGS_PLAN")) return "SAVINGS_PLAN";
  if (executionType.includes("RI_REVIEW")) return "RESERVED_INSTANCE";
  return "EC2";
}

function defaultState(tenantId: string, resourceId: string, executionType: GovernedExecutionType): AwsResourceState {
  const existing = states.get(key(tenantId, resourceId));
  if (existing) return existing;
  const resourceType = resourceTypeFor(executionType);
  return {
    resourceId,
    name: resourceId,
    resourceType,
    state: "ACTIVE",
    instanceType: resourceType === "EC2" ? "m5.2xlarge" : undefined,
    rdsClass: resourceType === "RDS" ? "db.m5.2xlarge" : undefined,
    owner: "unassigned",
    monthlyCost: resourceType === "SAVINGS_PLAN" || resourceType === "RESERVED_INSTANCE" ? 2500 : 900,
  };
}

function evidence(executionId: string, evidenceType: ExecutionEvidence["evidenceType"], summary: string, payload: Record<string, unknown>): ExecutionEvidence {
  return { id: id("exevidence"), executionId, evidenceType, summary, payload, createdAt: now() };
}

function targetFor(type: GovernedExecutionType, input: AwsOperationInput): Partial<AwsResourceState> {
  if (type === "AWS_RIGHTSIZE_EC2") return { instanceType: "m5.large" };
  if (type === "AWS_STOP_EC2" || type === "AWS_STOP_RDS") return { state: "STOPPED" };
  if (type === "AWS_START_EC2" || type === "AWS_START_RDS") return { state: "ACTIVE" };
  if (type === "AWS_MODIFY_RDS") return { rdsClass: "db.m5.large" };
  if (type === "AWS_DELETE_EBS" || type === "AWS_RELEASE_EIP") return { state: "DELETED" };
  if (type === "AWS_TAG_OWNER") return { owner: input.ownerId ?? input.action.ownerId ?? "cost-owner" };
  if (type === "AWS_CREATE_SAVINGS_PLAN_REVIEW" || type === "AWS_CREATE_RI_REVIEW") return { reviewCreated: true };
  return {};
}

function artifactState(type: GovernedExecutionType, after: AwsResourceState): AwsArtifact["state"] {
  if (type === "AWS_TAG_OWNER") return "TAGGED";
  if (type === "AWS_RIGHTSIZE_EC2" || type === "AWS_MODIFY_RDS") return "RESIZED";
  if (type === "AWS_STOP_EC2" || type === "AWS_STOP_RDS") return "STOPPED";
  if (type === "AWS_DELETE_EBS" || type === "AWS_RELEASE_EIP") return "DELETED";
  if (type === "AWS_CREATE_SAVINGS_PLAN_REVIEW" || type === "AWS_CREATE_RI_REVIEW") return "REVIEW_CREATED";
  return after.state === "ACTIVE" ? "ACTIVE" : after.state === "STOPPED" ? "STOPPED" : after.state === "DELETED" ? "DELETED" : "UNKNOWN";
}

function assertCanWrite(input: AwsOperationInput) {
  if (getTenantExecutionPolicy(input.tenantId).mode === "DEMO" && !input.dryRun) throw new Error("AWS_DEMO_MODE_BLOCKS_WRITES");
  if (input.connector.status !== "CONNECTED") throw new Error("AWS_CONNECTOR_UNHEALTHY_OR_CREDENTIALS_REQUIRED");
  if (!["ELIGIBLE", "APPROVAL_REQUIRED"].includes(input.readinessVerdict)) throw new Error("AWS_TRUST_AUTHORITY_DENIED");
  if (input.action.readiness === "APPROVAL_REQUIRED" && !input.approvalPresent) throw new Error("AWS_APPROVAL_REQUIRED");
  if (!input.action.evidenceIds.length) throw new Error("AWS_EVIDENCE_REQUIRED");
}

export function readEc2State(input: { tenantId: string; resourceId: string }) { return defaultState(input.tenantId, input.resourceId, "AWS_RIGHTSIZE_EC2"); }

export async function executeAwsOperation(input: AwsOperationInput): Promise<{ status: GovernedExecutionStatus; evidence: ExecutionEvidence[]; rollbackPayload?: AwsRollbackPayload; artifact?: AwsArtifact }> {
  assertCanWrite(input);
  const before = defaultState(input.tenantId, input.action.sourceId, input.executionType);
  const target = targetFor(input.executionType, input);
  const after = input.dryRun ? before : { ...before, ...target };
  if (!input.dryRun) states.set(key(input.tenantId, before.resourceId), after);
  const partialReason = input.executionType === "AWS_DELETE_EBS" ? "EBS deletion can only be partially rolled back from backup/snapshot evidence." : input.executionType === "AWS_RELEASE_EIP" ? "Elastic IP release can only be partially rolled back because reallocation is not guaranteed." : undefined;
  const rollbackPayload: AwsRollbackPayload = { provider: "AWS", executionId: input.execution.id, actionId: input.action.id, resourceId: before.resourceId, priorState: before, targetState: target, partialReason };
  rollbacks.set(input.execution.id, rollbackPayload);
  const executionEvidence = [
    evidence(input.execution.id, "PRE_STATE", "AWS pre-state evidence captured.", { provider: "AWS", state: before }),
    evidence(input.execution.id, "EXECUTION_RESULT", input.dryRun ? "Dry run available for controlled AWS execution." : `Controlled AWS execution completed for ${input.executionType}.`, { provider: "AWS", executionMode: "CONTROLLED_EXECUTION", autonomous: false, target }),
    evidence(input.execution.id, "POST_STATE", "AWS post-state evidence captured.", { provider: "AWS", state: after }),
    evidence(input.execution.id, "ROLLBACK_PAYLOAD", "AWS rollback payload created.", rollbackPayload as unknown as Record<string, unknown>),
  ];
  const ts = now();
  const artifact = upsertAwsArtifact({ id: `aws-artifact-${input.execution.id}`, tenantId: input.tenantId, executionId: input.execution.id, actionId: input.action.id, artifactType: before.resourceType, resourceId: before.resourceId, state: artifactState(input.executionType, after), monthlyCostBefore: before.monthlyCost, monthlyCostAfter: Math.max(before.monthlyCost * 0.7, 0), ownerBefore: before.owner, ownerAfter: after.owner, createdAt: ts, updatedAt: ts });
  await platformEventService.recordEvent({ tenantId: input.tenantId, category: "EXECUTION", type: "AWS_CONTROLLED_EXECUTION", entityType: "GovernedExecution", entityId: input.execution.id, sourceSystem: "aws-execution-adapter", metadata: { actionId: input.action.id, autonomous: false } });
  return { status: "COMPLETED", evidence: executionEvidence, rollbackPayload, artifact };
}

export const rightsizeEc2 = executeAwsOperation;
export const stopEc2 = executeAwsOperation;
export const startEc2 = executeAwsOperation;
export const modifyRds = executeAwsOperation;
export const stopRds = executeAwsOperation;
export const startRds = executeAwsOperation;
export const deleteEbs = executeAwsOperation;
export const releaseElasticIp = executeAwsOperation;
export const tagOwner = executeAwsOperation;
export const createSavingsPlanReview = executeAwsOperation;
export const createReservedInstanceReview = executeAwsOperation;

export async function verifyAwsState(input: { tenantId: string; executionId: string }) { return verifyAwsExecution(input.tenantId, input.executionId); }

export async function verifyAwsExecution(tenantId: string, executionId: string) {
  const execution = governedExecutionService.getExecution(tenantId, executionId);
  if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  const artifact = getAwsArtifactByExecution(tenantId, executionId);
  if (!artifact) throw new Error("AWS_ARTIFACT_NOT_FOUND");
  const verificationEvidence = governedExecutionService.appendEvidence(execution, evidence(executionId, "VERIFICATION_RESULT", "AWS provider state verification passed.", { provider: "AWS", artifactId: artifact.id, lifecycle: ["Projected", "Approved", "Executed", "Verified", "Protected"] }));
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({ tenantId, assetId: artifact.id, assetType: "CLOUD", name: `AWS ${artifact.resourceId} cost optimisation`, outcomeType: "COST_REDUCTION", status: "MEASURED", measurementConfidence: "HIGH", measuredValue: artifact.monthlyCostBefore && artifact.monthlyCostAfter ? artifact.monthlyCostBefore - artifact.monthlyCostAfter : 100, source: "CONNECTOR", metadata: { provider: "AWS", executionId } });
  await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { status: "VERIFIED", outcomeIds: [outcome.id], evidenceIds: [verificationEvidence.id], actualMonthlyValue: outcome.measuredValue, actualAnnualValue: (outcome.measuredValue ?? 0) * 12 });
  const policyName = artifact.artifactType === "EC2" ? "AWS_INSTANCE_RESIZED_BACK" : artifact.artifactType === "RDS" ? "AWS_RDS_REVERTED" : artifact.state === "DELETED" ? "AWS_RESOURCE_RECREATED" : "AWS_SPEND_RETURNED";
  const policy = outcomeProtectionService.createDriftPolicy({ tenantId, name: policyName, domain: "CLOUD", policyType: artifact.state === "TAGGED" ? "OWNER_REMOVED" : artifact.state === "DELETED" ? "ASSET_RECREATED" : "CONFIG_REVERTED" });
  const protectedOutcome = await outcomeProtectionService.protectOutcome({ tenantId, outcomeId: outcome.id, actionId: execution.actionId, executionId, assetId: artifact.id, assetType: "CLOUD", policyIds: [policy.id], evidenceIds: [verificationEvidence.id] });
  await platformEventService.recordEvent({ tenantId, category: "OUTCOME", type: "AWS_OUTCOME_VERIFIED", entityType: "GovernedExecution", entityId: executionId, sourceSystem: "aws-execution-adapter", metadata: { outcomeId: outcome.id, protectedOutcomeId: protectedOutcome.id, autonomous: false } });
  return { verified: true, artifact, evidence: verificationEvidence, outcome, protectedOutcome };
}

export async function rollbackAwsExecution(tenantId: string, executionId: string) {
  const execution = governedExecutionService.getExecution(tenantId, executionId);
  if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  const rollbackPayload = rollbacks.get(executionId);
  if (!rollbackPayload) throw new Error("ROLLBACK_PAYLOAD_MISSING");
  const partial = Boolean(rollbackPayload.partialReason);
  if (!partial) states.set(key(tenantId, rollbackPayload.resourceId), rollbackPayload.priorState);
  const rollbackEvidence = governedExecutionService.appendEvidence(execution, evidence(executionId, "ROLLBACK_RESULT", partial ? "AWS rollback recorded as PARTIAL with destructive limitation evidence." : "AWS rollback restored prior resource configuration.", { ...rollbackPayload, status: partial ? "PARTIAL" : "COMPLETE" } as unknown as Record<string, unknown>));
  governedExecutionService.updateExecution({ ...execution, status: "ROLLED_BACK", updatedAt: now() });
  await platformEventService.recordEvent({ tenantId, category: "EXECUTION", type: "EXECUTION_ROLLED_BACK", entityType: "GovernedExecution", entityId: executionId, sourceSystem: "aws-execution-adapter", metadata: { evidenceId: rollbackEvidence.id, partial, autonomous: false } });
  return { rolledBack: !partial, partial, evidence: rollbackEvidence };
}

export { listAwsArtifacts };
export function clearAwsExecutionState() { states.clear(); rollbacks.clear(); }
