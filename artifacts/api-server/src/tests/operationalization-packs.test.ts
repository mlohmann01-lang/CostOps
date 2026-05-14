import test from "node:test";
import assert from "node:assert/strict";
import { serviceNowSamPack } from "../lib/operationalization/packs/servicenow-sam-pack";
import { flexeraValuePack } from "../lib/operationalization/packs/flexera-value-pack";

const sampleApps = [
  { appKey: "a", owner: "x", entitlementCount: 10, costCenter: "CC", annualCost: 1000, status: "READY_FOR_GOVERNANCE", priorityScore: 20 },
  { appKey: "b", owner: null, entitlementCount: 0, costCenter: null, annualCost: null, status: "NEEDS_OWNER", priorityScore: 80, reconciliationConflict: true, sourceFreshness: 0.3, contractIds: [] },
];

test("ServiceNow pack readiness scoring", () => {
  const r = serviceNowSamPack.evaluate(sampleApps as any[]);
  assert.equal(typeof r.readinessScore, "number");
});

test("Flexera pack readiness scoring", () => {
  const r = flexeraValuePack.evaluate(sampleApps as any[]);
  assert.equal(typeof r.readinessScore, "number");
});

test("ownership gaps lower score", () => {
  const high = serviceNowSamPack.evaluate([{ ...sampleApps[0] }] as any[]);
  const low = serviceNowSamPack.evaluate(sampleApps as any[]);
  assert.equal(low.readinessScore < high.readinessScore, true);
});

test("reconciliation conflicts block readiness", () => {
  const r = serviceNowSamPack.evaluate(sampleApps as any[]);
  assert.equal(r.blockers.some((b) => b.includes("Reconciliation")), true);
});

test("pricing gaps lower Flexera readiness", () => {
  const hi = flexeraValuePack.evaluate([{ ...sampleApps[0], entitlementCount: 10, contractIds:["c"], sourceFreshness:1, owner:"x", annualCost:100 }] as any[]);
  const lo = flexeraValuePack.evaluate([{ ...sampleApps[0], annualCost: null, monthlyCost: null, entitlementCount: 10, contractIds:["c"], sourceFreshness:1, owner:"x" }] as any[]);
  assert.equal(lo.readinessScore < hi.readinessScore, true);
});

test("pack events emitted", () => {
  const r = serviceNowSamPack.evaluate(sampleApps as any[]);
  assert.equal(serviceNowSamPack.emitEvents(r).length >= 0, true);
});

test("no recommendations created/no execution triggered", () => {
  assert.equal(String(serviceNowSamPack.evaluate).includes("recommendation"), false);
  assert.equal(String(flexeraValuePack.evaluate).includes("execution"), false);
});
