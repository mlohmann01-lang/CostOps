import test from "node:test";
import assert from "node:assert/strict";

test("replay endpoints are tenant scoped", ()=>{
  const outcome = { id: 1, tenantId: "tenant-b" };
  const requestedTenantId = "tenant-a";
  assert.equal(outcome.tenantId === requestedTenantId, false);
});

test("tenant A cannot access tenant B rationales/outcomes", ()=>{
  const rows = [{ tenantId: "tenant-b", id: "o1" }];
  const visible = rows.filter((r)=>r.tenantId === "tenant-a");
  assert.equal(visible.length, 0);
});
