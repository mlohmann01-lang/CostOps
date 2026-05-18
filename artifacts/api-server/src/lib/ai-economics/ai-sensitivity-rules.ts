import type { AIDomainCandidate } from "./ai-decision-intelligence-integration";

export interface AISensitivityResult { sensitivityClass: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"; approvalRequired: boolean; reasons: string[]; }

export function evaluateAIOperationalSensitivity(candidate: AIDomainCandidate): AISensitivityResult {
  const reasons: string[] = [];
  let cls: AISensitivityResult["sensitivityClass"] = "LOW";
  if (candidate.operationalContext.businessCriticalGroupMember) { cls = "CRITICAL"; reasons.push("CRITICAL_PRODUCTION_DEPENDENCY"); }
  if (!candidate.operationalContext.ownerDefined) { cls = cls === "CRITICAL" ? "CRITICAL" : "HIGH"; reasons.push("MISSING_OWNERSHIP"); }
  if (String(candidate.aiMetadata.aiGovernanceState) === "SHADOW") { cls = "HIGH"; reasons.push("SHADOW_AI_TOOL"); }
  if (/RECLAIM/.test(candidate.proposedActionType) && Number(candidate.aiMetadata.aiProductivitySignal ?? 0) > 0.8) reasons.push("HIGH_PRODUCTIVITY_SUPPRESS_AGGRESSIVE_RECLAIM");
  return { sensitivityClass: cls, approvalRequired: cls === "HIGH" || cls === "CRITICAL", reasons };
}
