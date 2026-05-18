import { createHash } from "node:crypto";
import type { M365Candidate } from "../playbooks/m365-multi-playbooks";
import type { RecommendationCandidate } from "./recommendation-candidate-types";
import { detectRecommendationConflicts } from "./recommendation-conflict-detector";
import { evaluateOperationalSensitivity } from "./operational-sensitivity-model";
import { calculateRecommendationConfidence } from "./recommendation-confidence-engine";
import { summarizeRecommendationMemory, type RecommendationHistoryRecord } from "./recommendation-memory-model";
import { arbitrateRecommendationCandidates } from "./recommendation-arbitration-engine";
import { rankFinalRecommendations } from "./recommendation-ranking-engine";

export const toM365RecommendationCandidate = (tenantId: string, playbook: { id: string; name: string; action: string; defaultExecutionMode: "APPROVAL_REQUIRED"|"MANUAL"|"AUTOMATED"; riskClass: "A"|"B"|"C"; }, input: M365Candidate): RecommendationCandidate & Record<string, any> => {
  const annual = Math.max(0, (input.cost ?? 0) * 12);
  const freshnessDays = input.days ?? 999;
  const stable = `${tenantId}:${playbook.id}:${input.email}:${playbook.action}`;
  const id = createHash("sha256").update(stable).digest("hex").slice(0, 16);
  return {
    candidateId: `m365-${id}`,
    tenantId,
    domain: "m365",
    sourcePlaybookId: playbook.id,
    sourcePlaybookName: playbook.name,
    entityType: "user",
    entityId: input.email,
    entityDisplayName: input.displayName,
    proposedActionType: playbook.action,
    proposedActionLabel: playbook.action,
    recommendationMode: playbook.defaultExecutionMode === "APPROVAL_REQUIRED" ? "APPROVAL_REQUIRED" : "RECOMMEND_ONLY",
    evidenceRefs: [{ evidenceId: `ev-${id}`, source: "m365", collectedAt: new Date(0).toISOString(), freshnessHours: freshnessDays * 24, confidence: 0.8 }],
    trustSnapshot: { trustScore: 0.75, trustBand: "HIGH", trustReasons: ["m365 evidence mapped"], usageSignalFreshnessDays: freshnessDays, evidenceQuality: 0.8 },
    actionRiskProfile: { actionRiskClass: playbook.riskClass === "A" ? "CRITICAL" : playbook.riskClass === "B" ? "MODERATE" : "LOW", reversibility: "HIGH", blastRadius: "LOW", riskReasons: [] },
    savingsEstimate: { annualizedSavingsEstimate: annual, monthlySavingsEstimate: Math.max(0, input.cost ?? 0), currency: "USD", savingsConfidence: "MODERATE" },
    operationalContext: { ownerDefined: !input.ownershipUnclear, recentActivityDays: input.days, privileged: Boolean(input.isPrivileged || input.isAdmin), serviceAccount: input.email.toLowerCase().includes("service"), sharedMailbox: Boolean(input.isSharedMailbox || input.mailboxType === "shared"), vip: Boolean(input.isExecutive), contractor: Boolean(input.isContractor), businessCriticalGroupMember: false, department: input.department, costCenter: input.costCentre },
    approvalRequirement: { approvalRequired: true, approvalReasons: ["M365_EXPANSION_PACK_1_DEFAULT_APPROVAL"] },
    createdAt: new Date(0).toISOString(),
    idempotencyKey: stable,
    playbookPriority: 50,
    arbitrationHints: ["M365_EXPANSION_PACK_1"],
    sensitivityHints: [input.isPrivileged ? "PRIVILEGED" : "STANDARD"],
    rankingHints: [annual > 1000 ? "HIGH_SAVINGS" : "STANDARD"],
    replayCorrelationId: `replay-${id}`,
    lineageCorrelationId: `lineage-${id}`,
  };
};

export const computeM365ExpansionPack1RecommendationReport = (candidates: (RecommendationCandidate & Record<string, any>)[], history: RecommendationHistoryRecord[] = []) => {
  const conflicts = detectRecommendationConflicts(candidates);
  const memory = summarizeRecommendationMemory(history);
  const sensitivity = candidates.map((c) => evaluateOperationalSensitivity(c));
  const confidence = candidates.map((c) => {
    const s = sensitivity.find((x) => x.candidateId === c.candidateId)!;
    return calculateRecommendationConfidence(c, s, memory);
  });
  const arbitrated = arbitrateRecommendationCandidates(candidates, { conflictResults: conflicts, sensitivityResults: sensitivity, confidenceResults: confidence });
  const ranked = rankFinalRecommendations(arbitrated);
  const promoted = ranked.filter((r) => r.finalDecision === "PROMOTED" || r.finalDecision === "PROMOTED_WITH_APPROVAL");
  const suppressed = ranked.filter((r) => r.finalDecision.startsWith("SUPPRESSED"));
  const deferred = ranked.filter((r) => r.finalDecision === "DEFERRED");
  const blocked = ranked.filter((r) => r.finalDecision === "BLOCKED");
  const highSensitivityCount = ranked.filter((r) => r.sensitivityClass === "HIGH" || r.sensitivityClass === "CRITICAL").length;
  const lowConfidenceCount = ranked.filter((r) => (r.confidenceScore ?? 0) < 50).length;
  const estimatedAnnualSavings = candidates.filter((c) => promoted.some((p) => p.candidateId === c.candidateId)).reduce((a, c) => a + c.savingsEstimate.annualizedSavingsEstimate, 0);
  const estimatedSavingsAtRisk = candidates.filter((c) => suppressed.some((s) => s.candidateId === c.candidateId)).reduce((a, c) => a + c.savingsEstimate.annualizedSavingsEstimate, 0);
  const quality = Math.max(0, Math.min(100, Math.round((promoted.length / Math.max(1, candidates.length)) * 100) - blocked.length * 10 - lowConfidenceCount * 2));
  const expansionReadinessStatus = blocked.length > 0 ? "HARDENING_REQUIRED" : lowConfidenceCount > Math.ceil(candidates.length * 0.4) ? "READY_WITH_LIMITS" : "READY_FOR_PACK_2";
  return { totalCandidates: candidates.length, promotedCount: ranked.filter((r) => r.finalDecision === "PROMOTED").length, approvalRequiredCount: ranked.filter((r) => r.finalDecision === "PROMOTED_WITH_APPROVAL").length, suppressedCount: suppressed.length, deferredCount: deferred.length, blockedCount: blocked.length, conflictCount: conflicts.length, highSensitivityCount, lowConfidenceCount, estimatedAnnualSavings, estimatedSavingsAtRisk, recommendationQualityScore: quality, replayReadinessStatus: "READY", lineageIntegrityStatus: "READY", decisionIntelligenceStatus: "ACTIVE", expansionReadinessStatus, topRiskAreas: lowConfidenceCount ? ["LOW_CONFIDENCE_EVIDENCE"] : ["STANDARD"], recommendedNextPlaybooks: ["M365_PACK_2_RIGHTSIZING"], rankedRecommendations: ranked };
};
