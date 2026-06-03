import test from "node:test";
import assert from "node:assert/strict";
import { generateSaaSRationalisationOpportunity } from "../lib/playbooks/saas-rationalisation/saas-rationalisation-opportunity-provider";
import type { SaaSRationalisationFinding } from "../lib/playbooks/saas-rationalisation/saas-rationalisation-types";

const base: SaaSRationalisationFinding = { id: "f1", vendorName: "Dropbox", applicationName: "Dropbox", findingType: "DORMANT_VENDOR", riskLevel: "MEDIUM", capabilityCategory: "DOCUMENT_STORAGE", usersAssigned: 10, activeUsers: 1, annualCostEstimate: 1200, potentialAnnualSavings: 1200, trustScore: 90, rationale: "Dormant", recommendedAction: "Retire dormant vendor", evidenceRefs: ["enterprise-app:dropbox"] };

test("SaaS rationalisation opportunity summarizes supported savings and evidence", () => {
  const summary = generateSaaSRationalisationOpportunity([base, { ...base, id: "f2", findingType: "OWNER_GAP", potentialAnnualSavings: undefined, evidenceRefs: ["enterprise-app:claude"] }]);
  assert.equal(summary.totalPotentialAnnualSavings, 1200);
  assert.equal(summary.savingsConfidence, "HIGH");
  assert.equal(summary.findingsWithSavings.length, 1);
  assert.equal(summary.governanceOnlyFindings.length, 1);
  assert.ok(summary.evidenceRefs.includes("enterprise-app:dropbox"));
});

test("SaaS rationalisation opportunity does not fabricate savings for governance-only findings", () => {
  const summary = generateSaaSRationalisationOpportunity([{ ...base, findingType: "UNMANAGED_VENDOR", potentialAnnualSavings: undefined }]);
  assert.equal(summary.totalPotentialAnnualSavings, 0);
  assert.equal(summary.governanceOnlyFindings.length, 1);
});
