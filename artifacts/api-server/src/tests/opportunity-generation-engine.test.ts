import test from "node:test";
import assert from "node:assert/strict";
import { generateVendorChangeOpportunities } from "../lib/vcde/opportunity-generation-engine";
import type { StoredVendorChangeEvent, VendorImpactAssessment } from "../lib/vcde/vendor-change-types";

const change: StoredVendorChangeEvent = { id: "vc-aws", tenantId: "tenant-a", vendor: "AWS", category: "PRICE_CHANGE", title: "New Graviton Savings Opportunity", description: "AWS change", effectiveDate: "2026-06-15", sourceUrl: "https://aws.amazon.com", impactSeverity: "MEDIUM", detectedAt: "2026-05-30T00:00:00.000Z", status: "ASSESSED", affectedSpend: 48000, generatedOpportunityCount: 4 };
const impact: VendorImpactAssessment = { changeId: change.id, tenantId: "tenant-a", affectedUsers: 42, affectedDepartments: ["Platform"], affectedSpend: 48000, monthlyCostDelta: 5280, potentialActions: ["Rightsize", "Migrate", "Monitor"], evidence: [], assessedAt: "2026-05-30T00:00:00.000Z" };

test("creates vendor change opportunities", () => {
  const opportunities = generateVendorChangeOpportunities(change, impact);
  assert.equal(opportunities.length, 3);
  assert.equal(opportunities[0].recommendationSource, "VENDOR_CHANGE");
  assert.ok(opportunities[0].projectedMonthlySavings > 0);
});

test("governance required for migration", () => {
  const opportunities = generateVendorChangeOpportunities(change, impact);
  assert.equal(opportunities.some((opp) => opp.actionType === "MIGRATE" && opp.governanceRequired), true);
});
