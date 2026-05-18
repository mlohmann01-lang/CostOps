import type { RecommendationCandidate } from "./recommendation-candidate-types";
import type { OperationalSensitivityResult } from "./operational-sensitivity-model";
import type { RecommendationMemorySummary } from "./recommendation-memory-model";
export interface RecommendationConfidenceResult { candidateId: string; confidenceScore: number; confidenceBand: "VERY_HIGH"|"HIGH"|"MODERATE"|"LOW"|"UNSAFE"; confidenceReasons: string[]; confidencePenalties: string[]; recommendedDecision: "PROMOTE"|"PROMOTE_WITH_APPROVAL"|"DEFER"|"SUPPRESS"|"BLOCK"; }
export const calculateRecommendationConfidence = (candidate: RecommendationCandidate, sensitivity: OperationalSensitivityResult, memory?: RecommendationMemorySummary): RecommendationConfidenceResult => {
 let score = 50; const reasons:string[]=[]; const penalties:string[]=[]; const trust = candidate.trustSnapshot.trustScore;
 score += Math.round(trust * 25); reasons.push(`trust score contribution ${trust}`);
 score += candidate.savingsEstimate.savingsConfidence === "HIGH" ? 10 : candidate.savingsEstimate.savingsConfidence === "MODERATE" ? 4 : -4;
 score += candidate.actionRiskProfile.reversibility === "HIGH" ? 8 : candidate.actionRiskProfile.reversibility === "MEDIUM" ? 2 : -8;
 if (!candidate.operationalContext.ownerDefined) { score -= 8; penalties.push("missing ownership clarity"); }
 if ((candidate.operationalContext.recentActivityDays ?? 999) > 180) { score -= 6; penalties.push("stale usage signal"); }
 if (sensitivity.sensitivityClass === "CRITICAL") { score -= 25; penalties.push("critical sensitivity penalty"); }
 if (sensitivity.sensitivityClass === "HIGH") { score -= 12; penalties.push("high sensitivity penalty"); }
 if (memory) { score += memory.confidenceAdjustment; reasons.push(`memory adjustment ${memory.confidenceAdjustment}`); }
 score = Math.max(0, Math.min(100, score));
 const confidenceBand = score >= 85 ? "VERY_HIGH" : score >= 70 ? "HIGH" : score >= 50 ? "MODERATE" : score >= 30 ? "LOW" : "UNSAFE";
 const recommendedDecision = confidenceBand === "UNSAFE" ? "BLOCK" : sensitivity.approvalEscalationRequired || candidate.approvalRequirement.approvalRequired ? (score >= 45 ? "PROMOTE_WITH_APPROVAL" : "DEFER") : score >= 50 ? "PROMOTE" : score >= 35 ? "DEFER" : "SUPPRESS";
 return { candidateId: candidate.candidateId, confidenceScore: score, confidenceBand, confidenceReasons: reasons, confidencePenalties: penalties, recommendedDecision };
};
