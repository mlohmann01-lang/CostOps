import type { CrossDomainDuplicationFinding, CrossDomainEconomicRecommendation, CrossDomainGovernanceRiskResult, CrossDomainOutcomeAttributionResult } from "./cross-domain-economic-types";

export function arbitrateCrossDomainEconomicRecommendations(input:{tenantId:string; m365FinalRecommendations:Array<{id:string;confidence:number;savings:number;productivity:number}>; aiFinalRecommendations:Array<{id:string;confidence:number;savings:number;productivity:number}>; duplicationFindings:CrossDomainDuplicationFinding[]; outcomeAttribution:CrossDomainOutcomeAttributionResult[]; governanceRisks:CrossDomainGovernanceRiskResult[];}): CrossDomainEconomicRecommendation[] {
  const all = [
    ...input.m365FinalRecommendations.map((r)=>({source:"M365" as const, ...r})),
    ...input.aiFinalRecommendations.map((r)=>({source:"AI_ECONOMICS" as const, ...r})),
  ];
  return all.map((r, i) => {
    const dup = input.duplicationFindings.length > 0 && i > 0;
    const highRisk = input.governanceRisks.some((g) => g.severity === "CRITICAL");
    const weakOutcome = input.outcomeAttribution.some((o) => o.attributionStrength === "WEAK");
    const decision = highRisk ? "BLOCKED" : dup ? "SUPPRESSED_DUPLICATE" : weakOutcome && r.productivity < 1 ? "DEFERRED" : r.confidence < 0.5 ? "DEFERRED" : "PROMOTED";
    return { recommendationId:`xrec:${i}:${r.id}`, tenantId:input.tenantId, sourceDomains:[r.source], decision, priorityBand: decision === "BLOCKED" ? "CRITICAL_REVIEW" : decision.startsWith("SUPPRESSED") ? "SUPPRESSED" : r.savings > 1000 ? "HIGH_VALUE" : "STANDARD", confidenceScore:r.confidence, annualizedSavings:r.savings, productivityOpportunity:r.productivity, doubleCountRisk: dup ? 0.7 : 0.2, arbitrationReasons:[dup ? "DUPLICATE_CLAIM" : "NON_DUPLICATE", highRisk ? "GOVERNANCE_RISK" : "GOVERNANCE_ACCEPTABLE"], evidenceRefs:["cross-domain-arbitration"], replayCorrelationId:`replay:${input.tenantId}:${i}`, lineageCorrelationId:`lineage:${input.tenantId}:${i}` };
  });
}
