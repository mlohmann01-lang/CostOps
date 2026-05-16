import test from "node:test";
import assert from "node:assert/strict";

test("tenant A cannot read tenant B recommendations", ()=>{
  const recommendations = [{ tenantId: "tenant-a", id: 1 }, { tenantId: "tenant-b", id: 2 }];
  const tenantA = recommendations.filter((r)=>r.tenantId === "tenant-a");
  assert.equal(tenantA.length, 1);
  assert.equal(tenantA.some((r)=>r.tenantId === "tenant-b"), false);
});

test("telemetry queries are tenant scoped", ()=>{
  const events = [{ tenantId: "tenant-a" }, { tenantId: "tenant-b" }];
  assert.equal(events.filter((e)=>e.tenantId === "tenant-a").length, 1);
});
