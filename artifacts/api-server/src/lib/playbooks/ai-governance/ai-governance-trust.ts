import type { AIGovernanceTrustInput, AIGovernanceTrustResult } from "./ai-governance-types";

export function scoreAIGovernanceTrust(input: AIGovernanceTrustInput): AIGovernanceTrustResult {
  let score = 35;
  const reasons: string[] = [];

  if (input.ownerKnown) { score += 15; reasons.push("Application owner is known."); }
  else reasons.push("Application owner is missing.");
  if (input.approvalStatusKnown) { score += 15; reasons.push("Approval status is known."); }
  else reasons.push("Approval status needs validation.");
  if (input.usageEvidenceAvailable) { score += 15; reasons.push("Usage evidence is available."); }
  else reasons.push("Usage evidence is missing.");
  if (input.spendEstimateAvailable) { score += 10; reasons.push("Spend estimate is available."); }
  else reasons.push("Spend estimate is unavailable.");
  if (input.applicationMetadataAvailable) { score += 10; reasons.push("Application metadata is available."); }
  else reasons.push("Application metadata is incomplete.");
  if (input.evidenceRefsAvailable) { score += 10; reasons.push("Evidence references are available."); }
  else reasons.push("Evidence references are missing.");

  const trustScore = Math.min(100, score);
  const trustBand = trustScore >= 85 ? "HIGH" : trustScore >= 65 ? "MEDIUM" : trustScore >= 45 ? "LOW" : "BLOCKED";
  return { trustScore, trustBand, trustReasons: reasons };
}
