import type { OwnershipFinding, OwnershipInput, OwnershipOpportunityResult } from "./ownership-intelligence-types";

export const ownershipRecommendedActions = ["Assign business owner", "Assign technical owner", "Assign budget owner", "Assign renewal owner", "Confirm stale owner", "Resolve owner conflict", "Escalate high-spend ownerless app"];

export function generateOwnershipOpportunity(applications: OwnershipInput[], findings: OwnershipFinding[]): OwnershipOpportunityResult {
  const impactedIds = new Set(findings.map((finding) => `${finding.vendorName}:${finding.applicationName}`));
  const annualSpendWithoutOwner = applications.filter((app) => app.annualCost && (!app.businessOwner || !app.budgetOwner || !app.executiveSponsor)).reduce((sum, app) => sum + Number(app.annualCost ?? 0), 0);
  return {
    applicationsReviewed: applications.length,
    ownerlessApplications: applications.filter((app) => !app.businessOwner && !app.technicalOwner && !app.budgetOwner && !app.renewalOwner && !app.executiveSponsor).length,
    partiallyOwnedApplications: applications.filter((app) => Boolean(app.businessOwner || app.technicalOwner || app.budgetOwner || app.renewalOwner || app.executiveSponsor) && impactedIds.has(`${app.vendorName}:${app.applicationName}`)).length,
    conflictedOwners: findings.filter((finding) => finding.gapType === "OWNER_CONFLICT").length,
    staleOwners: findings.filter((finding) => finding.gapType === "OWNER_STALE").length,
    annualSpendWithoutOwner,
    renewalsWithoutOwner: applications.filter((app) => Boolean(app.renewalDate) && !app.renewalOwner).length,
    aiApplicationsWithoutOwner: applications.filter((app) => app.sourceContext?.includes("AI_GOVERNANCE") && !app.businessOwner).length,
    highRiskOwnershipFindings: findings.filter((finding) => finding.riskLevel === "HIGH" || finding.riskLevel === "CRITICAL").length,
    recommendedActions: ownershipRecommendedActions,
    evidenceRefs: Array.from(new Set(findings.flatMap((finding) => finding.evidenceRefs))),
  };
}
