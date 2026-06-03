import type { ShadowITFinding, ShadowITOpportunity, ShadowITOpportunityConfidence } from "./shadow-it-types";

const DEFAULT_ESTIMATED_ANNUAL_SEAT_COST = 240;

function confidenceFor(finding: ShadowITFinding, savings: number | undefined): ShadowITOpportunityConfidence {
  if (!savings) return finding.trustScore >= 75 ? "MEDIUM" : "LOW";
  if (finding.trustScore >= 85 && finding.userCount > 0) return "HIGH";
  if (finding.trustScore >= 60) return "MEDIUM";
  return "LOW";
}

function annualSeatCost(finding: ShadowITFinding) {
  if (finding.annualCostEstimate && finding.userCount > 0) return Math.round(finding.annualCostEstimate / finding.userCount);
  return DEFAULT_ESTIMATED_ANNUAL_SEAT_COST;
}

export function generateShadowITOpportunities(findings: ShadowITFinding[]): ShadowITOpportunity[] {
  return findings.map((finding) => {
    const rationalization = finding.findingType === "DORMANT_APPLICATION";
    const duplicate = finding.findingType === "DUPLICATE_CAPABILITY";
    const potentialAnnualSavings = rationalization || duplicate ? finding.userCount * annualSeatCost(finding) : undefined;
    const opportunityType = rationalization ? "RATIONALIZATION" : duplicate ? "DUPLICATE_CONSOLIDATION" : "GOVERNANCE_EXPOSURE";
    const rationale = potentialAnnualSavings
      ? `${finding.applicationName} has a ${finding.findingType.toLowerCase().replace(/_/g, " ")} opportunity with ${finding.userCount} affected users.`
      : `${finding.applicationName} requires governance review; no savings are estimated without rationalization or duplicate evidence.`;
    return {
      id: `opp-${finding.id}`,
      findingId: finding.id,
      applicationName: finding.applicationName,
      findingType: finding.findingType,
      potentialAnnualSavings,
      confidence: confidenceFor(finding, potentialAnnualSavings),
      opportunityType,
      rationale,
      evidenceRefs: finding.evidenceRefs,
    };
  });
}
