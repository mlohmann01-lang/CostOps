import type { SaaSRationalisationFinding, SaaSRationalisationOpportunitySummary, SaaSRationalisationSavingsConfidence } from "./saas-rationalisation-types";

function confidence(findingsWithSavings: SaaSRationalisationFinding[]): SaaSRationalisationSavingsConfidence {
  if (findingsWithSavings.length === 0) return "LOW";
  const highConfidence = findingsWithSavings.filter((finding) => finding.annualCostEstimate !== undefined && finding.usersAssigned !== undefined && finding.activeUsers !== undefined && finding.evidenceRefs.length > 0).length;
  if (highConfidence === findingsWithSavings.length) return "HIGH";
  if (findingsWithSavings.some((finding) => finding.annualCostEstimate !== undefined)) return "MEDIUM";
  return "LOW";
}

export function generateSaaSRationalisationOpportunity(findings: SaaSRationalisationFinding[]): SaaSRationalisationOpportunitySummary {
  const findingsWithSavings = findings.filter((finding) => typeof finding.potentialAnnualSavings === "number" && finding.potentialAnnualSavings > 0);
  const governanceOnlyFindings = findings.filter((finding) => !finding.potentialAnnualSavings);
  const evidenceRefs = Array.from(new Set(findings.flatMap((finding) => finding.evidenceRefs)));
  const totalPotentialAnnualSavings = Math.round(findingsWithSavings.reduce((sum, finding) => sum + Number(finding.potentialAnnualSavings ?? 0), 0));
  return {
    totalPotentialAnnualSavings,
    savingsConfidence: confidence(findingsWithSavings),
    findingsWithSavings,
    governanceOnlyFindings,
    topRationalisationActions: [
      "Consolidate duplicate tools by capability category",
      "Retire dormant vendors where cost and usage evidence supports savings",
      "Assign missing owners before renewal or consolidation decisions",
      "Review renewal-risk vendors before commitment dates",
      "Validate underused high-cost applications with business owners",
    ],
    evidenceRefs,
  };
}
