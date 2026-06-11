import { acquireM365AccessToken, getM365AuthConfig, type M365AuthConfig } from "./m365-auth";
import { approvalAuthorityEngine } from "../../approval-authority/approval-authority";
import { governedActionService, type GovernedAction } from "../../actions/governed-actions";
import { governedExecutionService, type ExecutionConnector, type ExecutionEvidence, type GovernedExecution, type GovernedExecutionStatus, type GovernedExecutionType } from "../../execution/governed-execution";
import { economicOutcomeAttributionService } from "../../economic-outcomes/economic-outcome-attribution";
import { outcomeProtectionService } from "../../outcome-protection/outcome-protection";
import { platformEventService } from "../../events/platform-event-service";
import { evaluateLiveTenantExecutionGate, getTenantExecutionPolicy } from "../../runtime/live-tenant-safety";

export type M365TenantExecutionMode = "DEMO" | "DRY_RUN_ONLY" | "PRODUCTION";
export type M365LicenseState = { userId: string; assignedLicenses: string[]; requestId?: string; capturedAt: string; source: "GRAPH" | "CONTROLLED_FIXTURE" | "DRY_RUN" };
export type M365LicenseRollbackPayload = { userId: string; removedSkuId: string; previousAssignedLicenses: string[]; timestamp: string };

type TenantRuntime = { mode: M365TenantExecutionMode; credentials?: M365AuthConfig; fetchImpl?: typeof fetch };
type OperationInput = { tenantId: string; action: GovernedAction; execution: GovernedExecution; executionType: GovernedExecutionType; userId: string; skuId?: string; targetSkuId?: string; dryRun?: boolean; approvalPresent: boolean; readinessVerdict: string; connector: ExecutionConnector };

const runtimes = new Map<string, TenantRuntime>();
const graphState = new Map<string, Set<string>>();
const GRAPH_BASE_DEFAULT = "https://graph.microsoft.com/v1.0";

function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`; }
function key(tenantId: string, userId: string) { return `${tenantId}:${userId}`; }
function evidence(executionId: string, evidenceType: ExecutionEvidence["evidenceType"], summary: string, payload: Record<string, unknown>): ExecutionEvidence { return { id: id("exevidence"), executionId, evidenceType, summary, payload, createdAt: now() }; }
function normalizeSku(input?: string, fallback?: string) { return input ?? fallback ?? "m365-sku-placeholder"; }
function isRemoval(type: GovernedExecutionType) { return ["REMOVE_M365_LICENSE", "REMOVE_COPILOT_LICENSE", "DOWNGRADE_M365_LICENSE"].includes(type); }
function isAssignment(type: GovernedExecutionType) { return ["ASSIGN_M365_LICENSE", "RESTORE_M365_LICENSE", "RESTORE_COPILOT_LICENSE", "REASSIGN_M365_LICENSE", "DOWNGRADE_M365_LICENSE"].includes(type); }

export function configureM365GraphExecutionTenant(tenantId: string, runtime: TenantRuntime) { runtimes.set(tenantId, runtime); }
export function seedM365UserLicenseState(tenantId: string, userId: string, assignedLicenses: string[]) { graphState.set(key(tenantId, userId), new Set(assignedLicenses)); }
export function clearM365GraphExecutionState() { runtimes.clear(); graphState.clear(); }

function runtimeFor(tenantId: string) {
  const configured = runtimes.get(tenantId);
  if (configured) return configured;
  return { mode: (process.env.M365_TENANT_EXECUTION_MODE as M365TenantExecutionMode) || "DEMO", credentials: getM365AuthConfig(), fetchImpl: fetch };
}

async function graphAssignLicense(tenantId: string, userId: string, addLicenses: string[], removeLicenses: string[]) {
  const runtime = runtimeFor(tenantId);
  const config = getM365AuthConfig(runtime.credentials ?? {});
  const token = await acquireM365AccessToken(config, runtime.fetchImpl ?? fetch);
  if (!token.accessToken) throw new Error(`M365_CONNECTOR_CREDENTIALS_REQUIRED:${token.error ?? "NO_TOKEN"}`);
  const response = await (runtime.fetchImpl ?? fetch)(`${config.graphBaseUrl || GRAPH_BASE_DEFAULT}/users/${encodeURIComponent(userId)}/assignLicense`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ addLicenses: addLicenses.map((skuId) => ({ skuId })), removeLicenses }),
  });
  const requestId = response.headers.get("request-id") ?? response.headers.get("x-ms-request-id") ?? token.requestId;
  if (!response.ok) throw new Error(`GRAPH_ASSIGN_LICENSE_FAILED:${response.status}`);
  return { requestId };
}

async function assertControlledWriteAllowed(input: OperationInput) {
  const runtime = runtimeFor(input.tenantId);
  if (input.dryRun) return runtime;
  if (runtime.mode === "DEMO") throw new Error("M365_DEMO_MODE_BLOCKS_GRAPH_WRITES");
  if (runtime.mode !== "PRODUCTION" || input.execution.executionMode !== "CONTROLLED") throw new Error("M365_CONTROLLED_PRODUCTION_MODE_REQUIRED");
  if (!runtime.credentials && !process.env.M365_TENANT_ID) throw new Error("M365_CONNECTOR_CREDENTIALS_REQUIRED");
  if (!input.approvalPresent && !approvalAuthorityEngine.isActionApproved(input.tenantId, input.action.id)) throw new Error("APPROVAL_AUTHORITY_REQUIRED");
  if (input.readinessVerdict === "BLOCKED" || input.readinessVerdict === "NEVER_ELIGIBLE") throw new Error(`READINESS_AUTHORITY_DENIED:${input.readinessVerdict}`);
  evaluateLiveTenantExecutionGate({ policy: getTenantExecutionPolicy(input.tenantId), action: input.action, trustAuthorityReport: { verdict: input.readinessVerdict as any }, approvalAuthorityReport: { verdict: input.approvalPresent ? "APPROVED" : "APPROVAL_REQUIRED" } as any, connector: input.connector, request: { tenantId: input.tenantId, domain: "M365", executionMode: input.execution.executionMode, dryRun: input.dryRun, destructive: true, blastRadius: input.action.blastRadius } });
  return runtime;
}

export async function readUserLicenseState(tenantId: string, userId: string): Promise<M365LicenseState> {
  const state = graphState.get(key(tenantId, userId));
  if (state) return { userId, assignedLicenses: [...state], capturedAt: now(), source: "CONTROLLED_FIXTURE" };
  const runtime = runtimeFor(tenantId);
  const config = getM365AuthConfig(runtime.credentials ?? {});
  const token = await acquireM365AccessToken(config, runtime.fetchImpl ?? fetch);
  if (!token.accessToken) throw new Error(`M365_CONNECTOR_CREDENTIALS_REQUIRED:${token.error ?? "NO_TOKEN"}`);
  const response = await (runtime.fetchImpl ?? fetch)(`${config.graphBaseUrl || GRAPH_BASE_DEFAULT}/users/${encodeURIComponent(userId)}?$select=id,assignedLicenses`, { headers: { Authorization: `Bearer ${token.accessToken}` } });
  if (!response.ok) throw new Error(`GRAPH_READ_LICENSE_STATE_FAILED:${response.status}`);
  const body = await response.json().catch(() => ({})) as { assignedLicenses?: Array<{ skuId?: string }> };
  return { userId, assignedLicenses: (body.assignedLicenses ?? []).map((row) => row.skuId).filter((skuId): skuId is string => Boolean(skuId)), requestId: response.headers.get("request-id") ?? undefined, capturedAt: now(), source: "GRAPH" };
}

export async function removeUserLicense(tenantId: string, userId: string, skuId: string) {
  const state = graphState.get(key(tenantId, userId));
  if (state) { state.delete(skuId); return { requestId: id("mockGraph"), userId, skuId }; }
  return graphAssignLicense(tenantId, userId, [], [skuId]);
}

export async function assignUserLicense(tenantId: string, userId: string, skuId: string) {
  const state = graphState.get(key(tenantId, userId));
  if (state) { state.add(skuId); return { requestId: id("mockGraph"), userId, skuId }; }
  return graphAssignLicense(tenantId, userId, [skuId], []);
}

export async function restoreUserLicense(tenantId: string, userId: string, previousState: M365LicenseRollbackPayload | M365LicenseState) {
  const assigned = "previousAssignedLicenses" in previousState ? previousState.previousAssignedLicenses : previousState.assignedLicenses;
  const state = graphState.get(key(tenantId, userId));
  if (state) { state.clear(); assigned.forEach((skuId) => state.add(skuId)); return { requestId: id("mockGraph"), userId, assignedLicenses: assigned }; }
  await graphAssignLicense(tenantId, userId, assigned, []);
  return { userId, assignedLicenses: assigned };
}

export async function verifyLicenseRemoved(tenantId: string, userId: string, skuId: string) { const state = await readUserLicenseState(tenantId, userId); return { passed: !state.assignedLicenses.includes(skuId), state }; }
export async function verifyLicenseAssigned(tenantId: string, userId: string, skuId: string) { const state = await readUserLicenseState(tenantId, userId); return { passed: state.assignedLicenses.includes(skuId), state }; }

export async function executeM365GraphOperation(input: OperationInput): Promise<{ status: GovernedExecutionStatus; evidence: ExecutionEvidence[]; rollbackPayload?: M365LicenseRollbackPayload }> {
  const skuId = normalizeSku(input.skuId, input.action.recommendationIds.find((value) => value.startsWith("sku:"))?.slice(4));
  const targetSkuId = normalizeSku(input.targetSkuId, input.action.recommendationIds.find((value) => value.startsWith("targetSku:"))?.slice(10));
  await assertControlledWriteAllowed(input);
  const pre = await readUserLicenseState(input.tenantId, input.userId).catch(() => ({ userId: input.userId, assignedLicenses: graphState.get(key(input.tenantId, input.userId)) ? [...graphState.get(key(input.tenantId, input.userId))!] : [skuId], capturedAt: now(), source: "DRY_RUN" as const }));
  const rows: ExecutionEvidence[] = [evidence(input.execution.id, "PRE_STATE", "M365 Graph pre-state captured before licence execution.", { ...pre, executionType: input.executionType })];
  let rollbackPayload: M365LicenseRollbackPayload | undefined;
  if (isRemoval(input.executionType)) {
    rollbackPayload = { userId: input.userId, removedSkuId: skuId, previousAssignedLicenses: pre.assignedLicenses, timestamp: now() };
    rows.push(evidence(input.execution.id, "ROLLBACK_PAYLOAD", "M365 rollback payload captured for licence removal.", rollbackPayload));
    if (!input.dryRun) await removeUserLicense(input.tenantId, input.userId, skuId);
  }
  if (isAssignment(input.executionType)) {
    if (!input.dryRun) await assignUserLicense(input.tenantId, input.userId, targetSkuId);
  }
  const post = input.dryRun ? { ...pre, assignedLicenses: isRemoval(input.executionType) ? pre.assignedLicenses.filter((s) => s !== skuId) : [...new Set([...pre.assignedLicenses, targetSkuId])] } : await readUserLicenseState(input.tenantId, input.userId);
  rows.push(evidence(input.execution.id, "EXECUTION_RESULT", `Controlled Microsoft Graph execution completed for ${input.executionType}.`, { userId: input.userId, skuId, targetSkuId, dryRun: Boolean(input.dryRun), autonomous: false, graphEndpoint: "/users/{id}/assignLicense" }));
  rows.push(evidence(input.execution.id, "POST_STATE", "M365 Graph post-state captured after licence execution.", { ...post, executionType: input.executionType }));
  return { status: "COMPLETED", evidence: rows, rollbackPayload };
}

export async function rollbackM365LicenseExecution(tenantId: string, executionId: string) {
  const execution = governedExecutionService.getExecution(tenantId, executionId);
  if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  const payloadEvidence = governedExecutionService.listEvidence(tenantId, executionId).find((row) => row.evidenceType === "ROLLBACK_PAYLOAD");
  if (!payloadEvidence?.payload) throw new Error("ROLLBACK_PAYLOAD_MISSING");
  const payload = payloadEvidence.payload as M365LicenseRollbackPayload;
  await restoreUserLicense(tenantId, payload.userId, payload);
  const verified = await verifyLicenseAssigned(tenantId, payload.userId, payload.removedSkuId);
  const rollbackEvidence = evidence(execution.id, "ROLLBACK_RESULT", "M365 rollback restored the removed licence and verified Graph state.", { rollbackPayload: payload, verified });
  governedExecutionService.appendEvidence(execution, rollbackEvidence);
  const updated = governedExecutionService.updateExecution({ ...execution, status: "ROLLED_BACK", updatedAt: now() });
  await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { executionStatus: "ROLLED_BACK", evidenceIds: [rollbackEvidence.id] });
  await platformEventService.recordEvent({ tenantId, category: "EXECUTION", type: "EXECUTION_ROLLED_BACK", entityType: "GovernedExecution", entityId: execution.id, sourceSystem: "m365-graph-execution", metadata: { actionId: execution.actionId, rollbackEvidenceId: rollbackEvidence.id, autonomous: false } });
  return { execution: updated, evidence: rollbackEvidence, verified };
}

export async function verifyM365Execution(tenantId: string, executionId: string) {
  const execution = governedExecutionService.getExecution(tenantId, executionId);
  if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  const ev = governedExecutionService.listEvidence(tenantId, executionId);
  const pre = ev.find((row) => row.evidenceType === "PRE_STATE")?.payload as any;
  const post = ev.find((row) => row.evidenceType === "POST_STATE")?.payload as any;
  const rollback = ev.find((row) => row.evidenceType === "ROLLBACK_PAYLOAD")?.payload as M365LicenseRollbackPayload | undefined;
  const userId = String(post?.userId ?? pre?.userId ?? rollback?.userId ?? "");
  const skuId = String(rollback?.removedSkuId ?? (ev.find((row) => row.evidenceType === "EXECUTION_RESULT")?.payload as any)?.skuId ?? "");
  const check = execution.executionType === "CONVERT_SHARED_MAILBOX_REVIEW" ? { passed: true, state: await readUserLicenseState(tenantId, userId) } : isRemoval(execution.executionType) ? await verifyLicenseRemoved(tenantId, userId, skuId) : await verifyLicenseAssigned(tenantId, userId, String((ev.find((row) => row.evidenceType === "EXECUTION_RESULT")?.payload as any)?.targetSkuId ?? skuId));
  const verificationEvidence = evidence(execution.id, "VERIFICATION_RESULT", check.passed ? "M365 Graph verification passed." : "M365 Graph verification failed.", { ...check, executionType: execution.executionType });
  governedExecutionService.appendEvidence(execution, verificationEvidence);
  if (!check.passed) { await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { status: "DRIFTED", evidenceIds: [verificationEvidence.id] }); return { verified: false, evidence: verificationEvidence }; }
  const action = await governedActionService.get(tenantId, execution.actionId);
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({ tenantId, assetId: action?.sourceId ?? userId, assetType: "M365", name: `Verified M365 outcome for ${action?.title ?? execution.actionId}`, status: "MEASURED", outcomeType: "COST_REDUCTION", measuredValue: action?.projectedAnnualValue ?? 0, source: "SYSTEM", metadata: { executionId, verificationEvidenceId: verificationEvidence.id, lifecycleState: "Verified" } });
  await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { status: "VERIFIED", outcomeIds: [outcome.id], actualAnnualValue: action?.projectedAnnualValue, actualMonthlyValue: action?.projectedMonthlyValue, evidenceIds: [verificationEvidence.id] });
  const policy = outcomeProtectionService.createDriftPolicy({ tenantId, name: `M365 drift policy for ${execution.actionId}`, domain: "M365", policyType: "LICENSE_REASSIGNMENT", checkFrequency: "DAILY" });
  const protectedOutcome = await outcomeProtectionService.protectOutcome({ tenantId, actionId: execution.actionId, executionId, outcomeId: outcome.id, assetType: "M365", policyIds: [policy.id], evidenceIds: [verificationEvidence.id, ...ev.map((row) => row.id)] });
  await platformEventService.recordEvent({ tenantId, category: "OUTCOME", type: "M365_OUTCOME_VERIFIED", entityType: "GovernedExecution", entityId: execution.id, sourceSystem: "m365-graph-execution", metadata: { outcomeId: outcome.id, protectedOutcomeId: protectedOutcome.id, policyId: policy.id, autonomous: false } });
  return { verified: true, evidence: verificationEvidence, outcome, protectedOutcome, driftPolicy: policy };
}
