import type { CrossDomainOutcomeAttributionResult, CrossDomainOutcomeSignal, CrossDomainSpendSignal, CrossDomainUsageSignal } from "./cross-domain-economic-types";

export function attributeCrossDomainOutcomes(outcomeSignals: CrossDomainOutcomeSignal[], spendSignals: CrossDomainSpendSignal[], usageSignals: CrossDomainUsageSignal[]): CrossDomainOutcomeAttributionResult[] {
  return outcomeSignals.map((o, idx) => {
    const spend = spendSignals.filter((s) => s.entityRef.entityId === o.entityRef.entityId).reduce((sum, s) => sum + s.annualizedCost, 0);
    const usage = usageSignals.filter((u) => u.entityRef.entityId === o.entityRef.entityId).reduce((sum, u) => sum + u.usageVolume, 0);
    const doubleCountRisk = spend > 0 && usage > 0 ? 0.4 : 0.1;
    return { attributionId:`attr:${idx}`, tenantId:o.tenantId, outcomeType:o.outcomeType, involvedDomains:["M365","AI_ECONOMICS"], projectedValue:o.projectedValue, realizedValue:o.realizedValue, confidence:o.confidence, doubleCountRisk, attributionStrength: o.realizedValue > spend ? "STRONG" : o.realizedValue > spend * 0.5 ? "MODERATE" : "WEAK", explanation:"Cross-domain outcome attribution from spend+usage+outcome signals.", evidenceRefs:o.evidenceRefs };
  });
}
