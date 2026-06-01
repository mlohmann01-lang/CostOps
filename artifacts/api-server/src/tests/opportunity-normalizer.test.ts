import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOpportunity } from "../lib/opportunity-factory/opportunity-normalizer";

test("normalizer produces canonical opportunity fields", () => {
  const opportunity = normalizeOpportunity({ opportunityId: "raw-1", recommendationSource: "VENDOR_CHANGE", changeId: "vc-1", title: "Vendor action", projectedMonthlySavings: 100, governanceRequired: true }, "tenant-a", "2026-06-01T00:00:00.000Z");
  assert.equal(opportunity.tenantId, "tenant-a");
  assert.equal(opportunity.source, "VENDOR_CHANGE");
  assert.equal(opportunity.sourceReferenceId, "vc-1");
  assert.equal(opportunity.projectedAnnualSavings, 1200);
  assert.equal(opportunity.readiness, "APPROVAL_REQUIRED");
  assert.equal(opportunity.status, "DISCOVERED");
  assert.equal(opportunity.updatedAt, "2026-06-01T00:00:00.000Z");
});
