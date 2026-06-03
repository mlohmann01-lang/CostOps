import type { RenewalFinding, RenewalOpportunityResult } from "./renewal-contract-types";

const actionList = ["Renegotiate before renewal", "Reduce seats before renewal", "Consolidate duplicate vendors", "Retire low-use tools", "Assign contract owner", "Validate missing usage/cost data", "Prepare executive renewal review"];

export function generateRenewalContractOpportunity(findings: RenewalFinding[]): RenewalOpportunityResult {
  const findingsWithSavings = findings.filter((finding) => Number(finding.potentialAnnualSavings ?? 0) > 0 && typeof finding.annualCost === "number");
  const governanceOnlyFindings = findings.filter((finding) => !findingsWithSavings.includes(finding));
  const totalPotentialAnnualSavings = findingsWithSavings.reduce((sum, finding) => sum + Number(finding.potentialAnnualSavings ?? 0), 0);
  const evidenceRefs = Array.from(new Set(findings.flatMap((finding) => finding.evidenceRefs)));
  const highConfidence = findingsWithSavings.every((finding) => typeof finding.annualCost === "number" && typeof finding.utilisationRate === "number" && Boolean(finding.renewalDate) && finding.evidenceRefs.length > 0);
  const mediumConfidence = findingsWithSavings.some((finding) => typeof finding.annualCost === "number" && Boolean(finding.renewalDate));
  return {
    totalPotentialAnnualSavings,
    savingsConfidence: highConfidence && findingsWithSavings.length > 0 ? "HIGH" : mediumConfidence ? "MEDIUM" : "LOW",
    findingsWithSavings,
    governanceOnlyFindings,
    upcomingRenewals: findings.filter((finding) => finding.findingType === "UPCOMING_RENEWAL"),
    topRenewalActions: actionList,
    evidenceRefs,
  };
}
