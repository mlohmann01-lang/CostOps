import { approvalAuthorityEngine } from "../approval-authority/approval-authority";
import { governedActionService, type GovernedAction } from "../actions/governed-actions";
import { governedExecutionService, type ExecutionConnector, type ExecutionEvidence, type GovernedExecution, type GovernedExecutionStatus, type GovernedExecutionType } from "../execution/governed-execution";
import { economicOutcomeAttributionService } from "../economic-outcomes/economic-outcome-attribution";
import { outcomeProtectionService } from "../outcome-protection/outcome-protection";
import { platformEventService } from "../events/platform-event-service";
import { aiIntelligenceService, type AIAsset } from "./ai-intelligence";
import { evaluateLiveTenantExecutionGate, getTenantExecutionPolicy } from "../runtime/live-tenant-safety";

export type AIProviderExecutionCapability = {
  provider: string;
  canApproveAsset: boolean;
  canDisableAsset: boolean;
  canEnableAsset: boolean;
  canAssignOwner: boolean;
  canVerifyState: boolean;
  canRollback: boolean;
};
export type AIProviderExecutionMode = "DEMO" | "DRY_RUN_ONLY" | "PRODUCTION";
export type AIExecutionRollbackPayload = { assetId: string; previousStatus: AIAsset["status"]; previousApprovalStatus: AIAsset["approvalStatus"]; previousOwnerId?: string; previousMetadata: Record<string, unknown>; executionType: GovernedExecutionType; timestamp: string };

type ProviderRuntime = { mode: AIProviderExecutionMode; capabilities?: Partial<AIProviderExecutionCapability> };
type OperationInput = { tenantId: string; action: GovernedAction; execution: GovernedExecution; executionType: GovernedExecutionType; assetId: string; ownerId?: string; policyId?: string; dryRun?: boolean; approvalPresent: boolean; readinessVerdict: string; connector: ExecutionConnector };

const providerRuntimes = new Map<string, ProviderRuntime>();
const providerAliases: Record<string, string> = { OPENAI: "OpenAI", ANTHROPIC: "Anthropic", GITHUB_COPILOT: "GitHub Copilot", "GITHUB COPILOT": "GitHub Copilot", MICROSOFT_COPILOT: "Microsoft Copilot", "MICROSOFT COPILOT": "Microsoft Copilot", CURSOR: "Cursor", CLAUDE_TEAMS: "Claude Teams", "CLAUDE TEAMS": "Claude Teams", GEMINI_ENTERPRISE: "Gemini Enterprise", "GEMINI ENTERPRISE": "Gemini Enterprise", CUSTOM_MCP: "Custom MCP Servers", "CUSTOM MCP": "Custom MCP Servers", "CUSTOM MCP SERVERS": "Custom MCP Servers" };
const baseCapabilities: AIProviderExecutionCapability[] = ["OpenAI", "Anthropic", "GitHub Copilot", "Microsoft Copilot", "Cursor", "Claude Teams", "Gemini Enterprise", "Custom MCP Servers"].map((provider) => ({ provider, canApproveAsset: true, canDisableAsset: true, canEnableAsset: true, canAssignOwner: true, canVerifyState: true, canRollback: true }));

function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`; }
function canonicalProvider(provider: string) { return providerAliases[provider.toUpperCase()] ?? provider; }
function evidence(executionId: string, evidenceType: ExecutionEvidence["evidenceType"], summary: string, payload: Record<string, unknown>): ExecutionEvidence { return { id: id("aievidence"), executionId, evidenceType, summary, payload, createdAt: now() }; }
function isRollbackApplicable(type: GovernedExecutionType) { return ["RETIRE_AI_ASSET", "DISABLE_AI_ASSET", "ASSIGN_AI_OWNER", "ENFORCE_AI_POLICY", "ENABLE_AI_ASSET"].includes(type); }
function expectedState(type: GovernedExecutionType, ownerId?: string, policyId?: string) {
  if (type === "APPROVE_AI_ASSET") return { approvalStatus: "APPROVED" as const, status: "ACTIVE" as const };
  if (type === "RETIRE_AI_ASSET") return { status: "RETIRED" as const };
  if (type === "DISABLE_AI_ASSET") return { status: "BLOCKED" as const };
  if (type === "ENABLE_AI_ASSET") return { status: "ACTIVE" as const };
  if (type === "ASSIGN_AI_OWNER") return { ownerId };
  if (type === "ENFORCE_AI_POLICY") return { metadata: { policyEnforced: true, policyId: policyId ?? "ai-policy-default" } };
  return {};
}

export function configureAIProviderExecution(provider: string, runtime: ProviderRuntime) { providerRuntimes.set(canonicalProvider(provider), runtime); }
export function clearAIProviderExecutionState() { providerRuntimes.clear(); }
export function listAIProviderExecutionCapabilities(): AIProviderExecutionCapability[] { return baseCapabilities.map((capability) => ({ ...capability, ...(providerRuntimes.get(capability.provider)?.capabilities ?? {}) })); }
export function getAIProviderExecutionCapability(provider: string) { const canonical = canonicalProvider(provider); return listAIProviderExecutionCapabilities().find((capability) => capability.provider === canonical) ?? { provider: canonical, canApproveAsset: false, canDisableAsset: false, canEnableAsset: false, canAssignOwner: false, canVerifyState: false, canRollback: false }; }
function runtimeFor(provider: string): ProviderRuntime { return providerRuntimes.get(canonicalProvider(provider)) ?? { mode: (process.env.AI_PROVIDER_EXECUTION_MODE as AIProviderExecutionMode) || "DEMO" }; }

function assertControlledAIExecutionAllowed(input: OperationInput, asset: AIAsset, capability: AIProviderExecutionCapability) {
  if (!input.action.evidenceIds.length) throw new Error("AI_EXECUTION_EVIDENCE_REQUIRED");
  if (input.readinessVerdict === "BLOCKED" || input.readinessVerdict === "NEVER_ELIGIBLE") throw new Error(`READINESS_AUTHORITY_DENIED:${input.readinessVerdict}`);
  if (!input.approvalPresent && !approvalAuthorityEngine.isActionApproved(input.tenantId, input.action.id)) throw new Error("APPROVAL_AUTHORITY_REQUIRED");
  const runtime = runtimeFor(asset.vendor);
  if (input.dryRun) return runtime;
  if (runtime.mode === "DEMO") throw new Error("AI_DEMO_MODE_BLOCKS_PROVIDER_EXECUTION");
  if (runtime.mode !== "PRODUCTION" || input.execution.executionMode !== "CONTROLLED") throw new Error("AI_CONTROLLED_PRODUCTION_MODE_REQUIRED");
  if (!capability.canVerifyState) throw new Error("AI_PROVIDER_VERIFY_STATE_REQUIRED");
  if (input.executionType === "APPROVE_AI_ASSET" && !capability.canApproveAsset) throw new Error("AI_PROVIDER_APPROVE_UNSUPPORTED");
  if (["RETIRE_AI_ASSET", "DISABLE_AI_ASSET"].includes(input.executionType) && !capability.canDisableAsset) throw new Error("AI_PROVIDER_DISABLE_UNSUPPORTED");
  if (input.executionType === "ENABLE_AI_ASSET" && !capability.canEnableAsset) throw new Error("AI_PROVIDER_ENABLE_UNSUPPORTED");
  if (input.executionType === "ASSIGN_AI_OWNER" && !capability.canAssignOwner) throw new Error("AI_PROVIDER_ASSIGN_OWNER_UNSUPPORTED");
  if (isRollbackApplicable(input.executionType) && !capability.canRollback) throw new Error("AI_PROVIDER_ROLLBACK_UNSUPPORTED");
  evaluateLiveTenantExecutionGate({ policy: getTenantExecutionPolicy(input.tenantId), action: input.action, trustAuthorityReport: { verdict: input.readinessVerdict as any }, approvalAuthorityReport: { verdict: input.approvalPresent ? "APPROVED" : "APPROVAL_REQUIRED" } as any, connector: input.connector, request: { tenantId: input.tenantId, domain: "AI", executionMode: input.execution.executionMode, dryRun: input.dryRun, destructive: isRollbackApplicable(input.executionType), blastRadius: input.action.blastRadius } });
  return runtime;
}

export function readAIAssetProviderState(tenantId: string, assetId: string) {
  const asset = aiIntelligenceService.getAsset(tenantId, assetId);
  if (!asset) throw new Error("AI_ASSET_NOT_FOUND");
  return { assetId, status: asset.status, approvalStatus: asset.approvalStatus, ownerId: asset.ownerId, metadata: asset.metadata, provider: canonicalProvider(asset.vendor), capturedAt: now() };
}

export async function approveAIAsset(tenantId: string, assetId: string) { return aiIntelligenceService.updateAsset(tenantId, assetId, { approvalStatus: "APPROVED", status: "ACTIVE" }); }
export async function retireAIAsset(tenantId: string, assetId: string) { return aiIntelligenceService.updateAsset(tenantId, assetId, { status: "RETIRED" }); }
export async function disableAIAsset(tenantId: string, assetId: string) { return aiIntelligenceService.updateAsset(tenantId, assetId, { status: "BLOCKED" }); }
export async function enableAIAsset(tenantId: string, assetId: string) { return aiIntelligenceService.updateAsset(tenantId, assetId, { status: "ACTIVE" }); }
export async function assignAIAssetOwner(tenantId: string, assetId: string, ownerId: string) { return aiIntelligenceService.updateAsset(tenantId, assetId, { ownerId }); }
export async function enforceAIAssetPolicy(tenantId: string, assetId: string, policyId: string) { const asset = aiIntelligenceService.getAsset(tenantId, assetId); if (!asset) throw new Error("AI_ASSET_NOT_FOUND"); return aiIntelligenceService.updateAsset(tenantId, assetId, { metadata: { ...asset.metadata, policyEnforced: true, policyId } }); }

export async function executeAIProviderOperation(input: OperationInput): Promise<{ status: GovernedExecutionStatus; evidence: ExecutionEvidence[]; rollbackPayload?: AIExecutionRollbackPayload }> {
  const asset = aiIntelligenceService.getAsset(input.tenantId, input.assetId);
  if (!asset) throw new Error("AI_ASSET_NOT_FOUND");
  const capability = getAIProviderExecutionCapability(asset.vendor);
  assertControlledAIExecutionAllowed(input, asset, capability);
  const pre = readAIAssetProviderState(input.tenantId, input.assetId);
  const rows: ExecutionEvidence[] = [evidence(input.execution.id, "PRE_STATE", "AI provider pre-state captured before governed execution.", { ...pre, executionType: input.executionType })];
  let rollbackPayload: AIExecutionRollbackPayload | undefined;
  if (isRollbackApplicable(input.executionType)) {
    rollbackPayload = { assetId: input.assetId, previousStatus: asset.status, previousApprovalStatus: asset.approvalStatus, previousOwnerId: asset.ownerId, previousMetadata: asset.metadata, executionType: input.executionType, timestamp: now() };
    rows.push(evidence(input.execution.id, "ROLLBACK_PAYLOAD", "AI provider rollback payload captured.", rollbackPayload));
  }
  if (!input.dryRun) {
    if (input.executionType === "APPROVE_AI_ASSET") await approveAIAsset(input.tenantId, input.assetId);
    if (input.executionType === "RETIRE_AI_ASSET") await retireAIAsset(input.tenantId, input.assetId);
    if (input.executionType === "DISABLE_AI_ASSET") await disableAIAsset(input.tenantId, input.assetId);
    if (input.executionType === "ENABLE_AI_ASSET") await enableAIAsset(input.tenantId, input.assetId);
    if (input.executionType === "ASSIGN_AI_OWNER") await assignAIAssetOwner(input.tenantId, input.assetId, input.ownerId ?? input.action.ownerId ?? "ai-owner");
    if (input.executionType === "ENFORCE_AI_POLICY") await enforceAIAssetPolicy(input.tenantId, input.assetId, input.policyId ?? "ai-policy-default");
  }
  const post = input.dryRun ? { ...pre, ...expectedState(input.executionType, input.ownerId ?? input.action.ownerId, input.policyId) } : readAIAssetProviderState(input.tenantId, input.assetId);
  rows.push(evidence(input.execution.id, "EXECUTION_RESULT", `Controlled AI provider execution completed for ${input.executionType}.`, { provider: capability.provider, assetId: input.assetId, executionType: input.executionType, ownerId: input.ownerId ?? input.action.ownerId, policyId: input.policyId, dryRun: Boolean(input.dryRun), autonomous: false }));
  rows.push(evidence(input.execution.id, "POST_STATE", "AI provider post-state captured after governed execution.", { ...post, executionType: input.executionType }));
  return { status: "COMPLETED", evidence: rows, rollbackPayload };
}

export async function rollbackAIExecution(tenantId: string, executionId: string) {
  const execution = governedExecutionService.getExecution(tenantId, executionId);
  if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  const payloadEvidence = governedExecutionService.listEvidence(tenantId, executionId).find((row) => row.evidenceType === "ROLLBACK_PAYLOAD");
  if (!payloadEvidence?.payload) throw new Error("AI_ROLLBACK_PAYLOAD_MISSING");
  const payload = payloadEvidence.payload as AIExecutionRollbackPayload;
  aiIntelligenceService.updateAsset(tenantId, payload.assetId, { status: payload.previousStatus, approvalStatus: payload.previousApprovalStatus, ownerId: payload.previousOwnerId, metadata: payload.previousMetadata });
  const state = readAIAssetProviderState(tenantId, payload.assetId);
  const passed = state.status === payload.previousStatus && state.approvalStatus === payload.previousApprovalStatus && state.ownerId === payload.previousOwnerId;
  const rollbackEvidence = evidence(execution.id, "ROLLBACK_RESULT", passed ? "AI rollback restored provider state." : "AI rollback failed provider-state verification.", { rollbackPayload: payload, state, passed });
  governedExecutionService.appendEvidence(execution, rollbackEvidence);
  const updated = governedExecutionService.updateExecution({ ...execution, status: "ROLLED_BACK", updatedAt: now() });
  await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { executionStatus: "ROLLED_BACK", evidenceIds: [rollbackEvidence.id] });
  await platformEventService.recordEvent({ tenantId, category: "EXECUTION", type: "AI_EXECUTION_ROLLED_BACK", entityType: "GovernedExecution", entityId: execution.id, sourceSystem: "ai-provider-execution", metadata: { actionId: execution.actionId, rollbackEvidenceId: rollbackEvidence.id, autonomous: false } });
  return { execution: updated, evidence: rollbackEvidence, verified: { passed, state } };
}

function verifyExpected(type: GovernedExecutionType, state: ReturnType<typeof readAIAssetProviderState>, executionResult: Record<string, unknown>) {
  if (type === "APPROVE_AI_ASSET") return state.approvalStatus === "APPROVED";
  if (type === "RETIRE_AI_ASSET") return state.status === "RETIRED";
  if (type === "DISABLE_AI_ASSET") return state.status === "BLOCKED";
  if (type === "ENABLE_AI_ASSET") return state.status === "ACTIVE";
  if (type === "ASSIGN_AI_OWNER") return Boolean(state.ownerId) && (!executionResult.ownerId || state.ownerId === executionResult.ownerId);
  if (type === "ENFORCE_AI_POLICY") return state.metadata?.policyEnforced === true;
  return false;
}

export async function verifyAIExecution(tenantId: string, executionId: string) {
  const execution = governedExecutionService.getExecution(tenantId, executionId);
  if (!execution) throw new Error("EXECUTION_NOT_FOUND");
  const evidenceRows = governedExecutionService.listEvidence(tenantId, executionId);
  const pre = evidenceRows.find((row) => row.evidenceType === "PRE_STATE")?.payload as any;
  const result = evidenceRows.find((row) => row.evidenceType === "EXECUTION_RESULT")?.payload as Record<string, unknown> | undefined ?? {};
  const assetId = String(result.assetId ?? pre?.assetId ?? "");
  const state = readAIAssetProviderState(tenantId, assetId);
  const passed = verifyExpected(execution.executionType, state, result);
  const verificationEvidence = evidence(execution.id, "VERIFICATION_RESULT", passed ? "AI provider verification passed." : "AI provider verification failed.", { executionType: execution.executionType, state, passed });
  governedExecutionService.appendEvidence(execution, verificationEvidence);
  if (!passed) { await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { status: "DRIFTED", evidenceIds: [verificationEvidence.id] }); return { verified: false, evidence: verificationEvidence }; }
  const action = await governedActionService.get(tenantId, execution.actionId);
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({ tenantId, assetId, assetType: "AI_ASSET", name: `Verified AI outcome for ${action?.title ?? execution.actionId}`, status: "MEASURED", outcomeType: "COST_REDUCTION", measuredValue: action?.projectedAnnualValue ?? 0, source: "SYSTEM", metadata: { executionId, verificationEvidenceId: verificationEvidence.id, lifecycleState: "Verified" } });
  await governedActionService.updateExecutionMetadata(tenantId, execution.actionId, { status: "VERIFIED", outcomeIds: [outcome.id], actualAnnualValue: action?.projectedAnnualValue, actualMonthlyValue: action?.projectedMonthlyValue, evidenceIds: [verificationEvidence.id] });
  const policyNames = ["AI_ASSET_REACTIVATED", "AI_POLICY_REMOVED", "AI_OWNER_REMOVED", "AI_SPEND_RETURNED", "AI_ASSET_RECREATED"];
  const policies = policyNames.map((name) => outcomeProtectionService.createDriftPolicy({ tenantId, name: `${name} policy for ${assetId}`, domain: "AI", policyType: "CUSTOM", checkFrequency: "DAILY" }));
  const protectedOutcome = await outcomeProtectionService.protectOutcome({ tenantId, actionId: execution.actionId, executionId, outcomeId: outcome.id, assetId, assetType: "AI_ASSET", policyIds: policies.map((policy) => policy.id), evidenceIds: [verificationEvidence.id, ...evidenceRows.map((row) => row.id)] });
  await platformEventService.recordEvent({ tenantId, category: "OUTCOME", type: "AI_OUTCOME_VERIFIED", entityType: "GovernedExecution", entityId: execution.id, sourceSystem: "ai-provider-execution", metadata: { outcomeId: outcome.id, protectedOutcomeId: protectedOutcome.id, policyIds: policies.map((policy) => policy.id), autonomous: false } });
  return { verified: true, evidence: verificationEvidence, outcome, protectedOutcome, driftPolicies: policies };
}
