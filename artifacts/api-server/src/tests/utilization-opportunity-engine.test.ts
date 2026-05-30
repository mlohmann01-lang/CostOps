import test from "node:test";
import assert from "node:assert/strict";
import { buildOpportunities } from "../lib/opportunities/opportunity-factory";
import { calculateUtilization } from "../lib/utilization/utilization-engine";
import { generateUtilizationOpportunities } from "../lib/utilization/utilization-opportunity-engine";

test("generates utilization opportunities and feeds the opportunity factory", () => {
  const records = [calculateUtilization({ id: "util-copilot", tenantId: "tenant-a", platform: "COPILOT", resourceName: "Copilot", assignedCount: 100, activeCount: 0, monthlyCost: 3000, lastActivityAt: "2026-05-30T12:00:00.000Z" })];
  const utilizationOpportunities = generateUtilizationOpportunities(records);
  assert.equal(utilizationOpportunities[0].title, "Copilot Reclaim Opportunity");
  assert.equal(utilizationOpportunities[0].source, "UTILIZATION");
  const opportunities = buildOpportunities({ utilizationOpportunities });
  assert.equal(opportunities[0].source, "UTILIZATION");
  assert.equal((opportunities[0] as any).utilizationRecordId, undefined);
});

test("does not generate opportunities for high utilization", () => {
  const records = [calculateUtilization({ id: "util-high", tenantId: "tenant-a", platform: "AWS", resourceName: "AWS RI", assignedCount: 100, activeCount: 90, monthlyCost: 5000, lastActivityAt: "2026-05-30T12:00:00.000Z" })];
  assert.equal(generateUtilizationOpportunities(records).length, 0);
});
