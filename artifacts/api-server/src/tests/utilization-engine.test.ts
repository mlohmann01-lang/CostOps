import test from "node:test";
import assert from "node:assert/strict";
import { calculateUtilization, summarizeUtilization, utilizationBandFor } from "../lib/utilization/utilization-engine";

const base = { id: "u1", tenantId: "tenant-a", platform: "COPILOT" as const, resourceName: "Copilot", assignedCount: 100, activeCount: 0, monthlyCost: 3000, lastActivityAt: "2026-05-30T12:00:00.000Z" };

test("calculates utilization bands and waste", () => {
  assert.equal(utilizationBandFor(0), "UNUSED");
  assert.equal(utilizationBandFor(25), "LOW");
  assert.equal(utilizationBandFor(60), "MEDIUM");
  assert.equal(utilizationBandFor(61), "HIGH");
  const record = calculateUtilization({ ...base, activeCount: 25 });
  assert.equal(record.utilizationPercent, 25);
  assert.equal(record.utilizationBand, "LOW");
  assert.equal(record.wasteEstimate, 2250);
});

test("summary totals assigned assets, unused value, and low utilization", () => {
  const records = [calculateUtilization(base), calculateUtilization({ ...base, id: "u2", activeCount: 80 })];
  const summary = summarizeUtilization(records, 1);
  assert.equal(summary.assetsAnalysed, 200);
  assert.equal(summary.unusedValue, 3000);
  assert.equal(summary.lowUtilization, 1);
  assert.equal(summary.generatedOpportunities, 1);
});
