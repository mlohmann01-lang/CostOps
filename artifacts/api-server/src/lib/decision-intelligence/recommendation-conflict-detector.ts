import type { RecommendationCandidate } from "./recommendation-candidate-types";
export type ConflictType = "DUPLICATE_ENTITY_ACTION"|"MUTUALLY_EXCLUSIVE_ACTIONS"|"SEQUENCING_CONFLICT"|"SENSITIVITY_CONFLICT"|"EVIDENCE_CONFLICT"|"SAVINGS_DOUBLE_COUNT_RISK"|"APPROVAL_REQUIREMENT_CONFLICT"|"TENANT_SCOPE_CONFLICT"|"OWNER_CONTEXT_CONFLICT";
export interface RecommendationConflict { conflictId: string; tenantId: string; involvedCandidateIds: string[]; conflictType: ConflictType; severity: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; recommendedResolution: "SUPPRESS_DUPLICATE"|"REQUIRE_ARBITRATION"|"DEFER"|"ESCALATE_APPROVAL"|"BLOCK"; explanation: string; }
const key=(c:RecommendationCandidate)=>`${c.tenantId}:${c.entityId}:${c.proposedActionType}`;
export const detectRecommendationConflicts = (candidates: RecommendationCandidate[]): RecommendationConflict[] => {
const out: RecommendationConflict[]=[]; const byKey = new Map<string, RecommendationCandidate[]>();
for (const c of candidates) byKey.set(key(c), [...(byKey.get(key(c))??[]), c]);
for (const [k,dups] of byKey.entries()) if (dups.length>1) out.push({ conflictId:`dup:${k}`, tenantId:dups[0].tenantId, involvedCandidateIds:dups.map(d=>d.candidateId), conflictType:"DUPLICATE_ENTITY_ACTION", severity:"HIGH", recommendedResolution:"SUPPRESS_DUPLICATE", explanation:"same tenant/entity/action emitted by multiple playbooks"});
for (let i=0;i<candidates.length;i++) for (let j=i+1;j<candidates.length;j++) { const a=candidates[i], b=candidates[j];
 if (a.tenantId!==b.tenantId) out.push({ conflictId:`tenant:${a.candidateId}:${b.candidateId}`, tenantId:a.tenantId, involvedCandidateIds:[a.candidateId,b.candidateId], conflictType:"TENANT_SCOPE_CONFLICT", severity:"CRITICAL", recommendedResolution:"BLOCK", explanation:"cross-tenant candidate grouping is forbidden"});
 if (a.entityId===b.entityId && a.proposedActionType!==b.proposedActionType) out.push({ conflictId:`mx:${a.candidateId}:${b.candidateId}`, tenantId:a.tenantId, involvedCandidateIds:[a.candidateId,b.candidateId], conflictType:"MUTUALLY_EXCLUSIVE_ACTIONS", severity:"MEDIUM", recommendedResolution:"REQUIRE_ARBITRATION", explanation:"same entity has differing actions"});
 if (a.entityId===b.entityId && a.savingsEstimate.annualizedSavingsEstimate>0 && b.savingsEstimate.annualizedSavingsEstimate>0) out.push({ conflictId:`save:${a.candidateId}:${b.candidateId}`, tenantId:a.tenantId, involvedCandidateIds:[a.candidateId,b.candidateId], conflictType:"SAVINGS_DOUBLE_COUNT_RISK", severity:"MEDIUM", recommendedResolution:"REQUIRE_ARBITRATION", explanation:"same entity has overlapping savings claims"});
 if (a.entityId===b.entityId && a.approvalRequirement.approvalRequired!==b.approvalRequirement.approvalRequired) out.push({ conflictId:`approve:${a.candidateId}:${b.candidateId}`, tenantId:a.tenantId, involvedCandidateIds:[a.candidateId,b.candidateId], conflictType:"APPROVAL_REQUIREMENT_CONFLICT", severity:"HIGH", recommendedResolution:"ESCALATE_APPROVAL", explanation:"approval policy disagreement"});
 }
 return out;
};
