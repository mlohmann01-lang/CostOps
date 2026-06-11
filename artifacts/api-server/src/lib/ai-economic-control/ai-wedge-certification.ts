import { governedActionService, type GovernedAction } from "../actions/governed-actions";
import { governedExecutionService, type GovernedExecutionType } from "../execution/governed-execution";
import { economicOutcomeAttributionService } from "../economic-outcomes/economic-outcome-attribution";
import { outcomeProtectionService } from "../outcome-protection/outcome-protection";
import { aiIntelligenceRepository, aiIntelligenceService, type AIAsset } from "./ai-intelligence";

export type AIAssetCertification = {
  assetId: string;
  discovery: "COMPLETE" | "MISSING";
  trust: "COMPLETE" | "MISSING";
  approval: "COMPLETE" | "MISSING";
  execution: "REAL_PROVIDER_EXECUTION" | "CONTROLLED_EXECUTION" | "SIMULATED_ONLY" | "NOT_IMPLEMENTED";
  rollback: "COMPLETE" | "MISSING" | "NOT_APPLICABLE";
  verification: "COMPLETE" | "MISSING";
  outcome: "COMPLETE" | "MISSING";
  protection: "COMPLETE" | "MISSING";
  drift: "COMPLETE" | "MISSING";
  executiveProof: "COMPLETE" | "MISSING";
  certified: boolean;
  blockers: string[];
};

const controlledAIExecutionTypes = new Set<GovernedExecutionType>(["APPROVE_AI_ASSET", "RETIRE_AI_ASSET", "ASSIGN_AI_OWNER", "ENFORCE_AI_POLICY", "DISABLE_AI_ASSET", "ENABLE_AI_ASSET"]);
const rollbackRequired = new Set<GovernedExecutionType>(["RETIRE_AI_ASSET", "ASSIGN_AI_OWNER", "ENFORCE_AI_POLICY", "DISABLE_AI_ASSET", "ENABLE_AI_ASSET"]);
function complete(value: boolean): "COMPLETE" | "MISSING" { return value ? "COMPLETE" : "MISSING"; }
function assetActions(actions: GovernedAction[], asset: AIAsset) { return actions.filter((action) => action.domain === "AI" && action.sourceId === asset.id); }
function hasEvidence(action: GovernedAction, patterns: string[]) { return action.evidenceIds.some((id) => patterns.some((pattern) => id.toLowerCase().includes(pattern))); }
function blockersFor(row: Omit<AIAssetCertification, "blockers" | "certified" | "assetId">) {
  const blockers: string[] = [];
  if (row.discovery !== "COMPLETE") blockers.push("Discovery evidence missing");
  if (row.trust !== "COMPLETE") blockers.push("Trust evidence missing");
  if (row.approval !== "COMPLETE") blockers.push("Approval evidence missing");
  if (!["CONTROLLED_EXECUTION", "REAL_PROVIDER_EXECUTION"].includes(row.execution)) blockers.push(`Execution is ${row.execution}`);
  if (row.rollback === "MISSING") blockers.push("Rollback evidence missing");
  if (row.verification !== "COMPLETE") blockers.push("Verification evidence missing");
  if (row.outcome !== "COMPLETE") blockers.push("Economic outcome missing");
  if (row.protection !== "COMPLETE") blockers.push("Protected outcome missing");
  if (row.drift !== "COMPLETE") blockers.push("Drift policy missing");
  if (row.executiveProof !== "COMPLETE") blockers.push("Executive proof missing");
  return blockers;
}

export async function getAIWedgeCertification(tenantId: string) {
  const assets = aiIntelligenceService.listAssets(tenantId);
  const actions = await governedActionService.list(tenantId);
  const executions = governedExecutionService.listExecutions(tenantId);
  const aiEvidence = aiIntelligenceRepository.listEvidence(tenantId);
  const outcomes = economicOutcomeAttributionService.listEconomicOutcomes(tenantId, { assetType: "AI_ASSET" });
  const protectedOutcomes = outcomeProtectionService.listProtectedOutcomes(tenantId, { assetType: "AI_ASSET" });
  const certifications = assets.map<AIAssetCertification>((asset) => {
    const actionsForAsset = assetActions(actions, asset);
    const executionsForAsset = executions.filter((execution) => actionsForAsset.some((action) => action.id === execution.actionId) && controlledAIExecutionTypes.has(execution.executionType));
    const executionEvidence = executionsForAsset.flatMap((execution) => governedExecutionService.listEvidence(tenantId, execution.id));
    const linkedOutcomeIds = new Set(actionsForAsset.flatMap((action) => action.outcomeIds));
    const linkedOutcomes = outcomes.filter((outcome) => outcome.assetId === asset.id || linkedOutcomeIds.has(outcome.id));
    const linkedProtected = protectedOutcomes.filter((outcome) => outcome.assetId === asset.id || actionsForAsset.some((action) => action.id === outcome.actionId) || linkedOutcomeIds.has(outcome.outcomeId));
    const executedTypes = new Set(executionsForAsset.map((execution) => execution.executionType));
    const needsRollback = [...executedTypes].some((type) => rollbackRequired.has(type));
    const base = {
      discovery: complete(aiEvidence.some((record) => record.entityId === asset.id)),
      trust: complete(actionsForAsset.some((action) => (action.trustScore ?? 0) > 0 && hasEvidence(action, ["trust", "readiness", "usage", "financial", "identity"]))),
      approval: complete(actionsForAsset.some((action) => ["APPROVED", "VERIFIED", "RETAINED"].includes(action.status) || hasEvidence(action, ["approval"]))),
      execution: executionsForAsset.some((execution) => execution.executionMode === "CONTROLLED" && execution.status === "COMPLETED") ? "CONTROLLED_EXECUTION" as const : executionsForAsset.some((execution) => execution.executionMode === "SIMULATION" || execution.status === "DRY_RUN") ? "SIMULATED_ONLY" as const : "NOT_IMPLEMENTED" as const,
      rollback: needsRollback ? (executionEvidence.some((row) => row.evidenceType === "ROLLBACK_PAYLOAD" || row.evidenceType === "ROLLBACK_RESULT") ? "COMPLETE" as const : "MISSING" as const) : "NOT_APPLICABLE" as const,
      verification: complete(executionEvidence.some((row) => row.evidenceType === "VERIFICATION_RESULT" && String(row.summary).toLowerCase().includes("passed"))),
      outcome: complete(linkedOutcomes.length > 0),
      protection: complete(linkedProtected.length > 0),
      drift: complete(linkedProtected.some((outcome) => outcome.policyIds.length > 0 && outcome.nextCheckAt)),
      executiveProof: complete(executionEvidence.some((row) => row.evidenceType === "PRE_STATE") && executionEvidence.some((row) => row.evidenceType === "POST_STATE") && executionEvidence.some((row) => row.evidenceType === "VERIFICATION_RESULT") && linkedProtected.length > 0),
    };
    const blockers = blockersFor(base);
    return { assetId: asset.id, ...base, certified: blockers.length === 0, blockers };
  });
  return { certifiedAssets: certifications.filter((row) => row.certified).length, uncertifiedAssets: certifications.filter((row) => !row.certified).length, certifications };
}
