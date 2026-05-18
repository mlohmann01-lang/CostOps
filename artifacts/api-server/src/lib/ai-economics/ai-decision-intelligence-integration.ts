import type { RecommendationCandidate } from "../decision-intelligence/recommendation-candidate-types";
import type { AIUsageRecord } from "./ai-usage-normalization";
import type { RecommendationCandidate as AICandidate } from "./ai-recommendation-candidates";

export type AIDomainCandidate = RecommendationCandidate & { aiMetadata: Record<string, unknown> };

export function normalizeAIPlaybookOutputsToCandidates(input: { tenantId: string; playbookId: string; playbookName: string; usageRecord: AIUsageRecord; candidates: AICandidate[]; }): AIDomainCandidate[] {
  return input.candidates.map((candidate, index) => ({
    candidateId: `${input.tenantId}:${input.playbookId}:${input.usageRecord.userId}:${index}`,
    tenantId: input.tenantId,
    domain: "AI_ECONOMICS",
    sourcePlaybookId: input.playbookId,
    sourcePlaybookName: input.playbookName,
    entityType: "AI_USER_TOOL_USAGE",
    entityId: `${input.usageRecord.userId}:${input.usageRecord.toolId}`,
    entityDisplayName: `${input.usageRecord.userId} / ${input.usageRecord.toolId}`,
    proposedActionType: candidate.recommendationType,
    proposedActionLabel: candidate.title,
    recommendationMode: "RECOMMEND_ONLY",
    evidenceRefs: [{ evidenceId: `ai:${input.playbookId}:${index}`, source: "ai-economics-playbook", collectedAt: input.usageRecord.timestamp, notes: candidate.summary }],
    trustSnapshot: { trustScore: 0.72, trustBand: "HIGH", trustReasons: ["AI playbook generated candidate"], usageSignalFreshnessDays: 1, evidenceQuality: 0.7 },
    actionRiskProfile: { actionRiskClass: "MODERATE", reversibility: "HIGH", blastRadius: "LOW", riskReasons: ["Recommendation-only action"] },
    savingsEstimate: { annualizedSavingsEstimate: Math.max(0, input.usageRecord.estimatedCost * 12), monthlySavingsEstimate: Math.max(0, input.usageRecord.estimatedCost), currency: "USD", savingsConfidence: "MODERATE" },
    operationalContext: { ownerId: input.usageRecord.userId, ownerType: "USER", ownerDefined: true, recentActivityDays: 7, privileged: false, serviceAccount: false, sharedMailbox: false, vip: false, contractor: false, businessCriticalGroupMember: false },
    approvalRequirement: { approvalRequired: false, approvalReasons: [] },
    createdAt: new Date().toISOString(),
    idempotencyKey: `ai:${input.tenantId}:${input.playbookId}:${input.usageRecord.userId}:${input.usageRecord.toolId}:${candidate.recommendationType}`,
    aiMetadata: {
      aiToolId: input.usageRecord.toolId, aiToolName: input.usageRecord.toolId, aiVendor: "unknown", aiCostCategory: "USAGE", aiUsageCategory: input.usageRecord.mode, aiOutcomeCategory: "EFFICIENCY", aiGovernanceState: "REVIEW_REQUIRED", aiSpendRisk: input.usageRecord.estimatedCost > 20 ? "HIGH" : "MEDIUM", aiProductivitySignal: input.usageRecord.productivitySignal,
      replayCorrelationId: `replay:${input.tenantId}:${index}`, lineageCorrelationId: `lineage:${input.tenantId}:${index}`,
    },
  }));
}

import { detectAIRecommendationConflicts } from "./ai-conflict-rules";
import { evaluateAIOperationalSensitivity } from "./ai-sensitivity-rules";
import { calculateAIRecommendationConfidence } from "./ai-confidence-rules";
import { computeAIEconomicsRecommendationReport } from "./ai-final-recommendation-report";

export interface AIMemorySummary { priorRecommendationCount: number; priorApprovalCount: number; priorRejectionCount: number; priorDeferralCount: number; priorOverrideCount: number; priorReversalCount: number; priorFalsePositiveCount: number; realizedAISavingsRate: number; productivityRealizationRate: number; toolLevelHistory: Record<string, number>; teamLevelHistory: Record<string, number>; playbookLevelHistory: Record<string, number>; reversalRate: number; falsePositiveRate: number; }
export function summarizeAIRecommendationMemory(history: Array<{status:string;toolId?:string;teamId?:string;playbookId?:string;realizedSavings?:boolean;realizedProductivity?:boolean}>): AIMemorySummary {
  const total = history.length || 1;
  const by = (k:string,v:string)=>history.filter((h:any)=>h[k]===v).length;
  return { priorRecommendationCount: history.length, priorApprovalCount: by("status","APPROVED"), priorRejectionCount: by("status","REJECTED"), priorDeferralCount: by("status","DEFERRED"), priorOverrideCount: by("status","OVERRIDDEN"), priorReversalCount: by("status","REVERSED"), priorFalsePositiveCount: by("status","FALSE_POSITIVE"), realizedAISavingsRate: history.filter((h)=>h.realizedSavings).length/total, productivityRealizationRate: history.filter((h)=>h.realizedProductivity).length/total, toolLevelHistory: {}, teamLevelHistory: {}, playbookLevelHistory: {}, reversalRate: by("status","REVERSED")/total, falsePositiveRate: by("status","FALSE_POSITIVE")/total };
}

export function rankAIRecommendations(items: Array<{candidate: AIDomainCandidate; confidence: number; sensitivity: string;}>) {
  return [...items].sort((a,b)=> (b.candidate.savingsEstimate.annualizedSavingsEstimate + b.confidence*100) - (a.candidate.savingsEstimate.annualizedSavingsEstimate + a.confidence*100)).map((x)=>({ ...x, priorityBand: x.confidence < 0.4 ? "WATCHLIST" : x.sensitivity === "CRITICAL" ? "CRITICAL_REVIEW" : x.candidate.savingsEstimate.annualizedSavingsEstimate > 500 ? "HIGH_VALUE" : "STANDARD" }));
}

export function runAIDecisionIntelligencePipeline(input:{tenantId:string;playbookId:string;playbookName:string;usageRecord:AIUsageRecord;candidates:AICandidate[];history?:Array<{status:string}>}){
  const normalized = normalizeAIPlaybookOutputsToCandidates(input);
  const conflicts = detectAIRecommendationConflicts(normalized);
  const memory = summarizeAIRecommendationMemory(input.history ?? []);
  const enriched = normalized.map((candidate)=>{ const sensitivity = evaluateAIOperationalSensitivity(candidate); const confidence = calculateAIRecommendationConfidence(candidate, sensitivity, memory); const finalDecision = confidence.score < 0.35 ? "DEFERRED" : sensitivity.approvalRequired ? "PROMOTED_WITH_APPROVAL" : "PROMOTED"; return { candidate, sensitivity, confidence, finalDecision, outcomeLedgerReady: true, projectedAICostDelta: candidate.savingsEstimate.monthlySavingsEstimate ?? 0, projectedAIProductivityDelta: Number(candidate.aiMetadata.aiProductivitySignal ?? 0), projectedAISpendAvoided: candidate.savingsEstimate.annualizedSavingsEstimate }; });
  const ranked = rankAIRecommendations(enriched.map((e)=>({candidate:e.candidate,confidence:e.confidence.score,sensitivity:e.sensitivity.sensitivityClass})));
  const report = computeAIEconomicsRecommendationReport({ conflictCount: conflicts.length, decisions: enriched.map((e)=>({ finalDecision:e.finalDecision, confidenceScore:e.confidence.score, sensitivityClass:e.sensitivity.sensitivityClass, annualizedSavingsEstimate:e.candidate.savingsEstimate.annualizedSavingsEstimate, spendAtRisk:e.projectedAICostDelta, productivityOpportunity:e.projectedAIProductivityDelta }))});
  return { normalized, conflicts, memory, enriched, ranked, report };
}
