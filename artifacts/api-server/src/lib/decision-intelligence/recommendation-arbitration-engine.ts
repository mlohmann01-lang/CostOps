import type { FinalRecommendationDecision, RecommendationCandidate } from "./recommendation-candidate-types";
import type { RecommendationConflict } from "./recommendation-conflict-detector";
import type { OperationalSensitivityResult } from "./operational-sensitivity-model";
import type { RecommendationConfidenceResult } from "./recommendation-confidence-engine";
export interface ArbitrationOptions { conflictResults: RecommendationConflict[]; sensitivityResults: OperationalSensitivityResult[]; confidenceResults: RecommendationConfidenceResult[]; }
export const arbitrateRecommendationCandidates = (candidates: RecommendationCandidate[], options: ArbitrationOptions): FinalRecommendationDecision[] => {
  const cMap = new Map(options.confidenceResults.map(c=>[c.candidateId,c])); const sMap = new Map(options.sensitivityResults.map(s=>[s.candidateId,s]));
  return candidates.map((c) => { const related = options.conflictResults.filter(x=>x.involvedCandidateIds.includes(c.candidateId)); const conf = cMap.get(c.candidateId); const sen = sMap.get(c.candidateId); const block = related.some(r=>r.severity==="CRITICAL"&&r.recommendedResolution==="BLOCK") || conf?.confidenceBand==="UNSAFE"; const dup = related.find(r=>r.conflictType==="DUPLICATE_ENTITY_ACTION");
    const finalDecision = block ? "BLOCKED" : dup ? "SUPPRESSED_DUPLICATE" : conf?.recommendedDecision === "DEFER" ? "DEFERRED" : conf?.recommendedDecision === "SUPPRESS" ? "SUPPRESSED_CONFLICT" : conf?.recommendedDecision === "PROMOTE_WITH_APPROVAL" ? "PROMOTED_WITH_APPROVAL" : "PROMOTED";
    const finalMode = finalDecision === "PROMOTED_WITH_APPROVAL" || sen?.approvalEscalationRequired ? "APPROVAL_REQUIRED" : c.recommendationMode === "READ_ONLY" ? "READ_ONLY" : "RECOMMEND_ONLY";
    return { candidateId: c.candidateId, finalDecision, finalMode, arbitrationReasons: related.map(r=>r.explanation), suppressionReasons: finalDecision.includes("SUPPRESSED") ? ["resolved by deterministic arbitration"] : [], approvalEscalationReasons: sen?.approvalEscalationRequired ? ["operational sensitivity escalation"] : [], winningCandidateId: undefined, relatedCandidateIds: related.flatMap(r=>r.involvedCandidateIds.filter(id=>id!==c.candidateId)), confidenceScore: conf?.confidenceScore, sensitivityClass: sen?.sensitivityClass };
  });
};
