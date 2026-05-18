import type { AIDomainCandidate } from "./ai-decision-intelligence-integration";

export interface AIConflictRecord { conflictId: string; tenantId: string; involvedCandidateIds: string[]; conflictType: string; severity: "LOW" | "MEDIUM" | "HIGH"; recommendedResolution: string; explanation: string; }

export function detectAIRecommendationConflicts(candidates: AIDomainCandidate[]): AIConflictRecord[] {
  const conflicts: AIConflictRecord[] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i]; const b = candidates[j]; const pair = [a.candidateId, b.candidateId];
      if (a.proposedActionType === b.proposedActionType && a.entityId === b.entityId) conflicts.push({ conflictId: `c:${i}:${j}:dup`, tenantId: a.tenantId, involvedCandidateIds: pair, conflictType: "DUPLICATE_AI_TOOL_RECOMMENDATION", severity: "MEDIUM", recommendedResolution: "SUPPRESS_DUPLICATE", explanation: "Same action for same entity." });
      if ((/RATIONALIZATION/.test(a.proposedActionType) && /RECLAIM/.test(b.proposedActionType)) || (/RATIONALIZATION/.test(b.proposedActionType) && /RECLAIM/.test(a.proposedActionType))) conflicts.push({ conflictId: `c:${i}:${j}:rvr`, tenantId: a.tenantId, involvedCandidateIds: pair, conflictType: "TOOL_RATIONALIZATION_VS_RECLAIM", severity: "HIGH", recommendedResolution: "PREFER_RATIONALIZATION_REVIEW", explanation: "Consolidation and reclaim conflict." });
      if (a.savingsEstimate.annualizedSavingsEstimate === b.savingsEstimate.annualizedSavingsEstimate && a.entityId !== b.entityId) conflicts.push({ conflictId: `c:${i}:${j}:save`, tenantId: a.tenantId, involvedCandidateIds: pair, conflictType: "DUPLICATE_SAVINGS_CLAIM", severity: "MEDIUM", recommendedResolution: "DEDUPLICATE_SAVINGS", explanation: "Potential duplicate savings claim." });
    }
  }
  return conflicts;
}
