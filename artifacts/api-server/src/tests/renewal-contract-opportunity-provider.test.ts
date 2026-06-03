import test from "node:test";
import assert from "node:assert/strict";
import { generateRenewalContractOpportunity } from "../lib/playbooks/renewals/renewal-contract-opportunity-provider";
import type { RenewalFinding } from "../lib/playbooks/renewals/renewal-contract-types";

const base: Omit<RenewalFinding, "id" | "findingType" | "recommendation" | "riskLevel"> = { vendorName: "Slack", applicationName: "Slack", annualCost: 1000, utilisationRate: 0.4, renewalDate: "2026-07-15", trustScore: 90, rationale: "review", recommendedAction: "act", evidenceRefs: ["contract:slack"] };

test("renewal opportunity calculates savings only where annual cost supports it", () => {
  const findings: RenewalFinding[] = [
    { ...base, id: "saving", findingType: "NEGOTIATION_OPPORTUNITY", riskLevel: "MEDIUM", recommendation: "RENEGOTIATE", potentialAnnualSavings: 150 },
    { ...base, id: "owner", findingType: "OWNER_GAP", riskLevel: "HIGH", recommendation: "INVESTIGATE", potentialAnnualSavings: undefined },
    { ...base, id: "missing-cost", findingType: "MISSING_COST_DATA", riskLevel: "MEDIUM", recommendation: "INVESTIGATE", annualCost: undefined, potentialAnnualSavings: 999 },
  ];
  const opportunity = generateRenewalContractOpportunity(findings);
  assert.equal(opportunity.totalPotentialAnnualSavings, 150);
  assert.equal(opportunity.findingsWithSavings.length, 1);
  assert.equal(opportunity.governanceOnlyFindings.some((finding) => finding.findingType === "OWNER_GAP"), true);
});
