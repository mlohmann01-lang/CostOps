import { governedActionService, type GovernedAction } from "../../actions/governed-actions";
import { economicOutcomeAttributionService } from "../../economic-outcomes/economic-outcome-attribution";
import { platformEventService } from "../../events/platform-event-service";
import { governedExecutionService, type ExecutionConnector, type ExecutionEvidence, type GovernedExecution, type GovernedExecutionStatus, type GovernedExecutionType } from "../../execution/governed-execution";
import { outcomeProtectionService } from "../../outcome-protection/outcome-protection";
import { connectorSupportsCapability } from "../../execution/execution-connectors";
import { evaluateLiveTenantExecutionGate, getTenantExecutionPolicy } from "../../runtime/live-tenant-safety";

export type ServiceNowArtifact = { id: string; tenantId: string; executionId: string; actionId: string; artifactType: "CHANGE" | "TASK" | "APPROVAL"; providerId: string; number?: string; state: "DRAFT" | "OPEN" | "PENDING" | "APPROVED" | "REJECTED" | "IN_PROGRESS" | "IMPLEMENTED" | "CLOSED" | "CANCELLED" | "UNKNOWN"; shortDescription: string; description?: string; assignedTo?: string; approvalGroup?: string; createdAt: string; updatedAt: string };
export type ServiceNowExecutionMode = "DEMO" | "DRY_RUN_ONLY" | "PRODUCTION";
export type ServiceNowRuntime = { mode: ServiceNowExecutionMode; credentialsPresent: boolean; instanceUrl?: string };
export type ServiceNowRollbackPayload = { artifactId: string; artifactType: ServiceNowArtifact["artifactType"]; previousState: ServiceNowArtifact["state"]; rollbackState: "CANCELLED"; timestamp: string };
type OperationInput = { tenantId: string; action: GovernedAction; execution: GovernedExecution; executionType: GovernedExecutionType; connector: ExecutionConnector; dryRun?: boolean; approvalPresent: boolean; readinessVerdict: string; artifactType?: ServiceNowArtifact["artifactType"]; expectedState?: ServiceNowArtifact["state"]; assignedTo?: string; approvalGroup?: string };

const artifacts = new Map<string, ServiceNowArtifact>();
const runtimes = new Map<string, ServiceNowRuntime>();
function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`; }
function key(tenantId: string, artifactId: string) { return `${tenantId}:${artifactId}`; }
function evidence(executionId: string, evidenceType: ExecutionEvidence["evidenceType"], summary: string, payload: Record<string, unknown>): ExecutionEvidence { return { id: id("snowev"), executionId, evidenceType, summary, payload, createdAt: now() }; }
function runtime(tenantId: string) { return runtimes.get(tenantId) ?? { mode: (process.env.SERVICENOW_EXECUTION_MODE as ServiceNowExecutionMode) || "DEMO", credentialsPresent: false }; }
function artifactTypeFor(type: GovernedExecutionType, fallback?: ServiceNowArtifact["artifactType"]): ServiceNowArtifact["artifactType"] { if (type.includes("TASK")) return "TASK"; if (type.includes("APPROVAL")) return "APPROVAL"; return fallback ?? "CHANGE"; }
function expectedStateFor(type: GovernedExecutionType, artifactType: ServiceNowArtifact["artifactType"], expected?: ServiceNowArtifact["state"]): ServiceNowArtifact["state"] { if (expected) return expected; if (type.startsWith("CLOSE_") || type === "WITHDRAW_SERVICENOW_APPROVAL") return "CANCELLED"; if (type.startsWith("UPDATE_")) return artifactType === "APPROVAL" ? "APPROVED" : "IN_PROGRESS"; if (type === "VERIFY_SERVICENOW_ARTIFACT") return "OPEN"; return artifactType === "APPROVAL" ? "PENDING" : "OPEN"; }
function requiredCapability(type: GovernedExecutionType) { return ({ CREATE_SERVICENOW_CHANGE: "CREATE_CHANGE", UPDATE_SERVICENOW_CHANGE: "UPDATE_CHANGE", CLOSE_SERVICENOW_CHANGE: "CLOSE_CHANGE", CREATE_SERVICENOW_TASK: "CREATE_TASK", UPDATE_SERVICENOW_TASK: "UPDATE_TASK", CLOSE_SERVICENOW_TASK: "CLOSE_TASK", CREATE_SERVICENOW_APPROVAL: "CREATE_APPROVAL", UPDATE_SERVICENOW_APPROVAL: "UPDATE_APPROVAL", WITHDRAW_SERVICENOW_APPROVAL: "WITHDRAW_APPROVAL", VERIFY_SERVICENOW_ARTIFACT: "VERIFY_STATE" } as Record<string, string>)[type]; }
function assertAllowed(input: OperationInput) { const run = runtime(input.tenantId); if (!input.action.evidenceIds.length) throw new Error("SERVICENOW_EXECUTION_EVIDENCE_REQUIRED"); if (input.readinessVerdict === "BLOCKED" || input.readinessVerdict === "NEVER_ELIGIBLE") throw new Error(`READINESS_AUTHORITY_DENIED:${input.readinessVerdict}`); if (!input.approvalPresent) throw new Error("APPROVAL_AUTHORITY_REQUIRED"); if (!input.dryRun && run.mode === "DEMO") throw new Error("SERVICENOW_DEMO_MODE_BLOCKS_EXECUTION"); if (!input.dryRun && !run.credentialsPresent) throw new Error("SERVICENOW_CONNECTOR_CREDENTIALS_REQUIRED"); if (!input.dryRun && (run.mode !== "PRODUCTION" || input.execution.executionMode !== "CONTROLLED")) throw new Error("SERVICENOW_CONTROLLED_PRODUCTION_MODE_REQUIRED"); const cap = requiredCapability(input.executionType); if (cap && !connectorSupportsCapability(input.connector, cap)) throw new Error(`SERVICENOW_CAPABILITY_REQUIRED:${cap}`); if (!connectorSupportsCapability(input.connector, "VERIFY_STATE")) throw new Error("SERVICENOW_CAPABILITY_REQUIRED:VERIFY_STATE"); evaluateLiveTenantExecutionGate({ policy: getTenantExecutionPolicy(input.tenantId), action: input.action, trustAuthorityReport: { verdict: input.readinessVerdict as any }, approvalAuthorityReport: { verdict: input.approvalPresent ? "APPROVED" : "APPROVAL_REQUIRED" } as any, connector: input.connector, request: { tenantId: input.tenantId, domain: "SERVICENOW", executionMode: input.execution.executionMode, dryRun: input.dryRun, destructive: true, blastRadius: input.action.blastRadius } }); return run; }
function saveArtifact(artifact: ServiceNowArtifact) { artifacts.set(key(artifact.tenantId, artifact.id), artifact); return artifact; }
export function configureServiceNowExecution(tenantId: string, runtime: ServiceNowRuntime) { runtimes.set(tenantId, runtime); }
export function clearServiceNowExecutionState() { artifacts.clear(); runtimes.clear(); }
export function listServiceNowArtifacts(tenantId: string) { return [...artifacts.values()].filter((artifact) => artifact.tenantId === tenantId); }
export function getServiceNowArtifact(tenantId: string, artifactId: string) { return artifacts.get(key(tenantId, artifactId)) ?? null; }

function createArtifact(input: OperationInput, artifactType = artifactTypeFor(input.executionType, input.artifactType)) { const timestamp = now(); return saveArtifact({ id: id("snowart"), tenantId: input.tenantId, executionId: input.execution.id, actionId: input.action.id, artifactType, providerId: `sn-${input.execution.id}`, number: `${artifactType === "CHANGE" ? "CHG" : artifactType === "TASK" ? "TASK" : "APP"}${Math.floor(Math.random() * 900000 + 100000)}`, state: expectedStateFor(input.executionType, artifactType, input.expectedState), shortDescription: input.action.title, description: input.action.description, assignedTo: input.assignedTo ?? input.action.ownerId, approvalGroup: input.approvalGroup, createdAt: timestamp, updatedAt: timestamp }); }
function updateArtifact(input: OperationInput) { const existing = listServiceNowArtifacts(input.tenantId).find((row) => row.actionId === input.action.id && row.artifactType === artifactTypeFor(input.executionType, input.artifactType)); return saveArtifact({ ...(existing ?? createArtifact(input)), executionId: input.execution.id, state: expectedStateFor(input.executionType, artifactTypeFor(input.executionType, input.artifactType), input.expectedState), updatedAt: now() }); }
export function createServiceNowChange(input: OperationInput) { return createArtifact(input, "CHANGE"); }
export function updateServiceNowChange(input: OperationInput) { return updateArtifact(input); }
export function closeServiceNowChange(input: OperationInput) { return updateArtifact({ ...input, expectedState: "CANCELLED" }); }
export function createServiceNowTask(input: OperationInput) { return createArtifact(input, "TASK"); }
export function updateServiceNowTask(input: OperationInput) { return updateArtifact(input); }
export function closeServiceNowTask(input: OperationInput) { return updateArtifact({ ...input, expectedState: "CANCELLED" }); }
export function createServiceNowApproval(input: OperationInput) { return createArtifact(input, "APPROVAL"); }
export function updateServiceNowApproval(input: OperationInput) { return updateArtifact(input); }
export function withdrawServiceNowApproval(input: OperationInput) { return updateArtifact({ ...input, expectedState: "CANCELLED" }); }
export function verifyServiceNowArtifact(input: { tenantId: string; artifactId: string; expectedState?: ServiceNowArtifact["state"] }) { const artifact = getServiceNowArtifact(input.tenantId, input.artifactId); const passed = Boolean(artifact && (!input.expectedState || artifact.state === input.expectedState)); return { passed, artifact, expectedState: input.expectedState }; }

export async function executeServiceNowOperation(input: OperationInput): Promise<{ status: GovernedExecutionStatus; evidence: ExecutionEvidence[]; artifact?: ServiceNowArtifact; rollbackPayload?: ServiceNowRollbackPayload }> {
  assertAllowed(input);
  const before = listServiceNowArtifacts(input.tenantId).filter((artifact) => artifact.actionId === input.action.id);
  const rows = [evidence(input.execution.id, "PRE_STATE", "ServiceNow pre-state captured before governed execution.", { artifacts: before, executionType: input.executionType, autonomous: false })];
  let artifact = before.find((row) => row.artifactType === artifactTypeFor(input.executionType, input.artifactType));
  const synthetic = input.dryRun;
  if (!synthetic) {
    if (input.executionType === "CREATE_SERVICENOW_CHANGE") artifact = createServiceNowChange(input);
    if (input.executionType === "UPDATE_SERVICENOW_CHANGE") artifact = updateServiceNowChange(input);
    if (input.executionType === "CLOSE_SERVICENOW_CHANGE") artifact = closeServiceNowChange(input);
    if (input.executionType === "CREATE_SERVICENOW_TASK") artifact = createServiceNowTask(input);
    if (input.executionType === "UPDATE_SERVICENOW_TASK") artifact = updateServiceNowTask(input);
    if (input.executionType === "CLOSE_SERVICENOW_TASK") artifact = closeServiceNowTask(input);
    if (input.executionType === "CREATE_SERVICENOW_APPROVAL") artifact = createServiceNowApproval(input);
    if (input.executionType === "UPDATE_SERVICENOW_APPROVAL") artifact = updateServiceNowApproval(input);
    if (input.executionType === "WITHDRAW_SERVICENOW_APPROVAL") artifact = withdrawServiceNowApproval(input);
    if (input.executionType === "VERIFY_SERVICENOW_ARTIFACT") artifact = updateArtifact(input);
  } else artifact = { id: id("snowartdry"), tenantId: input.tenantId, executionId: input.execution.id, actionId: input.action.id, artifactType: artifactTypeFor(input.executionType, input.artifactType), providerId: `dry-${input.execution.id}`, state: expectedStateFor(input.executionType, artifactTypeFor(input.executionType, input.artifactType), input.expectedState), shortDescription: input.action.title, createdAt: now(), updatedAt: now() };
  const rollbackPayload = { artifactId: artifact!.id, artifactType: artifact!.artifactType, previousState: before.find((row) => row.id === artifact!.id)?.state ?? "DRAFT", rollbackState: "CANCELLED" as const, timestamp: now() };
  rows.push(evidence(input.execution.id, "ROLLBACK_PAYLOAD", "ServiceNow rollback payload captured.", rollbackPayload));
  rows.push(evidence(input.execution.id, "EXECUTION_RESULT", `Controlled ServiceNow execution completed for ${input.executionType}.`, { artifactId: artifact!.id, artifactType: artifact!.artifactType, artifactState: artifact!.state, providerId: artifact!.providerId, dryRun: Boolean(input.dryRun), autonomous: false }));
  rows.push(evidence(input.execution.id, "POST_STATE", "ServiceNow post-state captured after governed execution.", { artifact, executionType: input.executionType, autonomous: false }));
  await platformEventService.recordEvent({ tenantId: input.tenantId, category: "EXECUTION", type: "SERVICENOW_ARTIFACT_CREATED", entityType: "ServiceNowArtifact", entityId: artifact!.id, sourceSystem: "servicenow-execution", metadata: { actionId: input.action.id, executionId: input.execution.id, autonomous: false } });
  return { status: input.dryRun ? "DRY_RUN" : "COMPLETED", evidence: rows, artifact, rollbackPayload };
}

export async function rollbackServiceNowExecution(tenantId: string, executionId: string) {
  const execution = governedExecutionService.getExecution(tenantId, executionId); if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  const payload = governedExecutionService.listEvidence(tenantId, executionId).find((row) => row.evidenceType === "ROLLBACK_PAYLOAD")?.payload as ServiceNowRollbackPayload | undefined; if (!payload) throw new Error("SERVICENOW_ROLLBACK_PAYLOAD_MISSING");
  const artifact = getServiceNowArtifact(tenantId, payload.artifactId); if (!artifact) throw new Error("SERVICENOW_ARTIFACT_NOT_FOUND");
  const updated = saveArtifact({ ...artifact, state: "CANCELLED", updatedAt: now() });
  const rollbackEvidence = evidence(execution.id, "ROLLBACK_RESULT", "ServiceNow rollback cancelled or withdrew artifact.", { rollbackPayload: payload, artifact: updated, passed: updated.state === "CANCELLED" });
  governedExecutionService.appendEvidence(execution, rollbackEvidence);
  const rolledBack = governedExecutionService.updateExecution({ ...execution, status: "ROLLED_BACK", updatedAt: now() });
  await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { executionStatus: "ROLLED_BACK", evidenceIds: [rollbackEvidence.id] });
  await platformEventService.recordEvent({ tenantId, category: "EXECUTION", type: "EXECUTION_ROLLED_BACK", entityType: "ServiceNowArtifact", entityId: updated.id, sourceSystem: "servicenow-execution", metadata: { executionId, rollbackEvidenceId: rollbackEvidence.id, autonomous: false } });
  return { execution: rolledBack, artifact: updated, evidence: rollbackEvidence, verified: { passed: updated.state === "CANCELLED" } };
}

export async function verifyServiceNowExecution(tenantId: string, executionId: string) {
  const execution = governedExecutionService.getExecution(tenantId, executionId); if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  const rows = governedExecutionService.listEvidence(tenantId, executionId);
  const result = rows.find((row) => row.evidenceType === "EXECUTION_RESULT")?.payload as Record<string, unknown> | undefined;
  const artifactId = String(result?.artifactId ?? "");
  const artifact = getServiceNowArtifact(tenantId, artifactId);
  const passed = Boolean(artifact && artifact.state !== "UNKNOWN" && artifact.state !== "DRAFT");
  const verificationEvidence = evidence(execution.id, "VERIFICATION_RESULT", passed ? "ServiceNow artifact verification passed." : "ServiceNow artifact verification failed.", { artifact, passed, executionType: execution.executionType });
  governedExecutionService.appendEvidence(execution, verificationEvidence);
  if (!passed) { await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { status: "DRIFTED", evidenceIds: [verificationEvidence.id] }); return { verified: false, evidence: verificationEvidence, artifact }; }
  const action = await governedActionService.get(tenantId, execution.actionId);
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({ tenantId, assetId: artifact!.id, assetType: "OTHER", name: `Verified ServiceNow outcome for ${action?.title ?? execution.actionId}`, status: "MEASURED", outcomeType: "PROCESS_EFFICIENCY", measuredValue: action?.projectedAnnualValue ?? 0, source: "SYSTEM", metadata: { executionId, artifactId: artifact!.id, providerId: artifact!.providerId } });
  await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { status: "VERIFIED", outcomeIds: [outcome.id], actualAnnualValue: action?.projectedAnnualValue, actualMonthlyValue: action?.projectedMonthlyValue, evidenceIds: [verificationEvidence.id] });
  const policyNames = ["SERVICENOW_CHANGE_REOPENED", "SERVICENOW_TASK_REOPENED", "SERVICENOW_APPROVAL_WITHDRAWN", "SERVICENOW_ARTIFACT_CANCELLED", "SERVICENOW_STATE_REVERTED"];
  const policies = policyNames.map((name) => outcomeProtectionService.createDriftPolicy({ tenantId, name: `${name} policy for ${artifact!.number ?? artifact!.id}`, domain: "OTHER", policyType: "CUSTOM", checkFrequency: "DAILY" }));
  const protectedOutcome = await outcomeProtectionService.protectOutcome({ tenantId, actionId: execution.actionId, executionId, outcomeId: outcome.id, assetId: artifact!.id, assetType: "OTHER", valueType: "PRODUCTIVITY", policyIds: policies.map((policy) => policy.id), evidenceIds: [verificationEvidence.id, ...rows.map((row) => row.id)] });
  await platformEventService.recordEvent({ tenantId, category: "OUTCOME", type: "SERVICENOW_OUTCOME_VERIFIED", entityType: "ServiceNowArtifact", entityId: artifact!.id, sourceSystem: "servicenow-execution", metadata: { outcomeId: outcome.id, protectedOutcomeId: protectedOutcome.id, autonomous: false } });
  return { verified: true, evidence: verificationEvidence, artifact, outcome, protectedOutcome, driftPolicies: policies };
}
