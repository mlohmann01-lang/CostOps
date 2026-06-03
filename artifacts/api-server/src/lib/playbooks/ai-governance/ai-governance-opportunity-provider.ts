import type { AIGovernanceFinding, AIGovernanceOpportunityResult } from "./ai-governance-types";

const savingsTypes = new Set(["DUPLICATE_AI_TOOLING", "UNMANAGED_AI_SPEND"]);

export function generateAIGovernanceOpportunity(findings: AIGovernanceFinding[]): AIGovernanceOpportunityResult {
  const findingsWithSavings = findings.filter((finding) => savingsTypes.has(finding.findingType) && Number(finding.potentialAnnualSavings ?? 0) > 0);
  const governanceOnlyFindings = findings.filter((finding) => !findingsWithSavings.includes(finding));
  const potentialAnnualSavings = findingsWithSavings.reduce((sum, finding) => sum + Number(finding.potentialAnnualSavings ?? 0), 0);
  const highRiskCount = findings.filter((finding) => finding.riskLevel === "HIGH" || finding.riskLevel === "CRITICAL").length;
  const governanceExposureScore = Math.min(100, Math.round(30 + highRiskCount * 5 + findings.filter((finding) => finding.findingType === "UNAPPROVED_AI_APPLICATION").length * 6));
  const policyFindings = findings.filter((finding) => finding.findingType === "AI_POLICY_GAP").length;
  const approvedFindings = findings.filter((finding) => finding.approved).length;
  const policyCoverageScore = approvedFindings ? Math.max(0, Math.round(100 - (policyFindings / approvedFindings) * 100)) : 0;

  return {
    potentialAnnualSavings,
    governanceExposureScore,
    policyCoverageScore,
    findingsWithSavings,
    governanceOnlyFindings,
    recommendedActions: [
      "Assign owner",
      "Review approval status",
      "Apply AI policy",
      "Consolidate AI tooling",
      "Review code-upload controls",
      "Review data-sharing controls",
    ],
  };
}
