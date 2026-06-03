import test from "node:test";
import assert from "node:assert/strict";
import { generateShadowITOpportunities } from "../lib/playbooks/shadow-it/shadow-it-opportunity-provider";
import type { ShadowITFinding } from "../lib/playbooks/shadow-it/shadow-it-types";

const baseFinding: ShadowITFinding = {
  id: "finding-1",
  applicationName: "Miro",
  findingType: "DORMANT_APPLICATION",
  riskLevel: "LOW",
  userCount: 7,
  annualCostEstimate: 1260,
  trustScore: 90,
  rationale: "Dormant application",
  recommendedAction: "Review rationalization",
  evidenceRefs: ["enterprise-app:miro"],
};

test("shadow IT opportunity provider estimates savings for dormant and duplicate applications", () => {
  const opportunities = generateShadowITOpportunities([baseFinding, { ...baseFinding, id: "finding-2", applicationName: "Dropbox", findingType: "DUPLICATE_CAPABILITY", userCount: 9, annualCostEstimate: 2160 }]);
  assert.equal(opportunities[0]?.potentialAnnualSavings, 1260);
  assert.equal(opportunities[0]?.confidence, "HIGH");
  assert.equal(opportunities[1]?.potentialAnnualSavings, 2160);
  assert.equal(opportunities[1]?.opportunityType, "DUPLICATE_CONSOLIDATION");
});

test("shadow IT opportunity provider does not fabricate savings for governance exposure", () => {
  const [opportunity] = generateShadowITOpportunities([{ ...baseFinding, findingType: "UNAPPROVED_APPLICATION", riskLevel: "MEDIUM" }]);
  assert.equal(opportunity?.potentialAnnualSavings, undefined);
  assert.equal(opportunity?.opportunityType, "GOVERNANCE_EXPOSURE");
});
