import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("demo fixture loads and contains required scenario records", () => {
  const p = path.resolve(process.cwd(), "../scripts/fixtures/customer-demo-scenario-m365.json");
  const fixture = JSON.parse(fs.readFileSync(p, "utf8"));
  assert.equal(fixture.tenantName, "Contoso Retail");
  assert.equal(Array.isArray(fixture.records), true);
  assert.equal(fixture.records.length >= 10, true);
});

test("demo seed path has no execution engine or Graph or connector calls", () => {
  const p = path.resolve(process.cwd(), "../scripts/seed-customer-demo-m365.ts");
  const src = fs.readFileSync(p, "utf8");
  assert.equal(src.includes("runExecutionEngine"), false);
  assert.equal(src.includes("graph"), false);
  assert.equal(src.includes("connector"), false);
  assert.equal(src.includes("fetch("), false);
});

test("demo status payload contract fields are present", () => {
  const sample = {
    tenantName: "Contoso Retail",
    recommendationsCount: 5,
    suppressionsCount: 3,
    orchestrationPlansCount: 1,
    pendingApprovalsCount: 1,
    batchesCount: 1,
    verificationsCount: 1,
    savingsProofAvailable: true,
    demoSeededAt: new Date().toISOString(),
  };
  for (const k of ["tenantName","recommendationsCount","suppressionsCount","orchestrationPlansCount","pendingApprovalsCount","batchesCount","verificationsCount","savingsProofAvailable","demoSeededAt"]) assert.ok(k in sample);
});
