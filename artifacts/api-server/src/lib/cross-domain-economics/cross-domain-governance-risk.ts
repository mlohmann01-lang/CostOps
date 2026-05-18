import type { CrossDomainGovernanceRiskResult, CrossDomainGovernanceSignal } from "./cross-domain-economic-types";

export function evaluateCrossDomainGovernanceRisk(signals: CrossDomainGovernanceSignal[]): CrossDomainGovernanceRiskResult[] {
  return signals.map((s, idx) => ({
    riskId:`risk:${idx}`,
    tenantId:s.tenantId,
    riskType:s.riskType,
    severity:s.severity,
    involvedDomains:["M365","AI_ECONOMICS"],
    involvedEntities:[s.entityRef],
    governanceImpact:"Cross-domain governance exposure detected.",
    recommendedAction: s.severity === "CRITICAL" ? "BLOCK_RECOMMENDATION" : s.severity === "HIGH" ? "ESCALATE_APPROVAL" : "REVIEW",
    confidence:s.confidence,
    evidenceRefs:s.evidenceRefs,
  }));
}
