import test from "node:test";
import assert from "node:assert/strict";
import { assessVendorChangeImpact } from "../lib/vcde/impact-assessment-engine";
import type { StoredVendorChangeEvent } from "../lib/vcde/vendor-change-types";

const change: StoredVendorChangeEvent = { id: "vc-microsoft", tenantId: "tenant-a", vendor: "MICROSOFT", category: "LICENSING_CHANGE", title: "Copilot Pricing Update", description: "Copilot changes", effectiveDate: "2026-07-01", sourceUrl: "https://microsoft.com", impactSeverity: "HIGH", detectedAt: "2026-05-30T00:00:00.000Z", status: "NEW", affectedSpend: 32000, generatedOpportunityCount: 6 };

test("calculates impact for affected tenant", () => {
  const impact = assessVendorChangeImpact(change);
  assert.equal(impact.tenantId, "tenant-a");
  assert.equal(impact.affectedUsers, 180);
  assert.equal(impact.monthlyCostDelta, 6400);
  assert.ok(impact.potentialActions.includes("Reclaim"));
});

test("includes evidence sources", () => {
  const impact = assessVendorChangeImpact(change);
  assert.ok(impact.evidence.includes("https://microsoft.com"));
  assert.ok(impact.evidence.some((item) => item.includes("Copilot")));
});
