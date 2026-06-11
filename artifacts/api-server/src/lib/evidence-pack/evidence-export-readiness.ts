import { governedActionService } from "../actions/governed-actions";
import { governedExecutionService } from "../execution/governed-execution";
import { outcomeProtectionService } from "../outcome-protection/outcome-protection";
import { assertTenantScopedCollection } from "../runtime/live-tenant-safety";

export type EvidenceExportMissingItem = "RECOMMENDATION_EVIDENCE" | "TRUST_EVIDENCE" | "APPROVAL_EVIDENCE" | "PRE_STATE_EVIDENCE" | "POST_STATE_EVIDENCE" | "VERIFICATION_EVIDENCE" | "OUTCOME_EVIDENCE" | "PROTECTION_EVIDENCE" | "DRIFT_EVIDENCE";
export type EvidenceExportReadiness = { tenantId: string; actionId?: string; wedge: "M365" | "AI" | "SERVICENOW"; ready: boolean; missing: EvidenceExportMissingItem | null; missingItems: EvidenceExportMissingItem[]; generatedAt: string };
function now() { return new Date().toISOString(); }
function matchesWedge(action: any, wedge: EvidenceExportReadiness["wedge"]) { if (wedge === "M365") return action.domain === "M365"; if (wedge === "AI") return action.domain === "AI"; return action.domain === "ITAM" || action.evidenceIds.some((id: string) => id.toLowerCase().includes("servicenow")); }
export async function evaluateEvidenceExportReadiness(input: { tenantId: string; actionId?: string; wedge: EvidenceExportReadiness["wedge"] }): Promise<EvidenceExportReadiness> {
  const actions = (await governedActionService.list(input.tenantId)).filter((action) => (!input.actionId || action.id === input.actionId) && matchesWedge(action, input.wedge));
  assertTenantScopedCollection(input.tenantId, actions);
  const executions = governedExecutionService.listExecutions(input.tenantId).filter((execution) => actions.some((action) => action.id === execution.actionId));
  const evidence = executions.flatMap((execution) => governedExecutionService.listEvidence(input.tenantId, execution.id));
  const protectedOutcomes = outcomeProtectionService.listProtectedOutcomes(input.tenantId).filter((outcome) => actions.some((action) => action.id === outcome.actionId));
  const missing = new Set<EvidenceExportMissingItem>();
  if (!actions.some((action) => action.recommendationIds.length > 0 || action.evidenceIds.some((id) => id.toLowerCase().includes("recommendation")))) missing.add("RECOMMENDATION_EVIDENCE");
  if (!actions.some((action) => action.evidenceIds.some((id) => id.toLowerCase().includes("trust") || id.toLowerCase().includes("readiness")))) missing.add("TRUST_EVIDENCE");
  if (!actions.some((action) => action.evidenceIds.some((id) => id.toLowerCase().includes("approval")) || ["APPROVED", "VERIFIED", "RETAINED"].includes(action.status))) missing.add("APPROVAL_EVIDENCE");
  if (!evidence.some((row) => row.evidenceType === "PRE_STATE")) missing.add("PRE_STATE_EVIDENCE");
  if (!evidence.some((row) => row.evidenceType === "POST_STATE")) missing.add("POST_STATE_EVIDENCE");
  if (!evidence.some((row) => row.evidenceType === "VERIFICATION_RESULT")) missing.add("VERIFICATION_EVIDENCE");
  if (!actions.some((action) => action.outcomeIds.length > 0)) missing.add("OUTCOME_EVIDENCE");
  if (!protectedOutcomes.length) missing.add("PROTECTION_EVIDENCE");
  if (!protectedOutcomes.some((outcome) => outcome.policyIds.length > 0)) missing.add("DRIFT_EVIDENCE");
  const missingItems = [...missing];
  return { tenantId: input.tenantId, actionId: input.actionId, wedge: input.wedge, ready: missingItems.length === 0, missing: missingItems[0] ?? null, missingItems, generatedAt: now() };
}
