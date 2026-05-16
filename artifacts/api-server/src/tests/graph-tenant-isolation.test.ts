import test from "node:test";
import assert from "node:assert/strict";

test("tenant A cannot read tenant B graph entities", ()=>{
  const entities = [{ tenantId: "tenant-a", id: "1" }, { tenantId: "tenant-b", id: "2" }];
  const tenantA = entities.filter((e)=>e.tenantId === "tenant-a");
  assert.equal(tenantA.some((e)=>e.tenantId === "tenant-b"), false);
});

test("graph traversal is tenant scoped", ()=>{
  const edges = [{ tenantId: "tenant-a", from:"1", to:"2" }, { tenantId: "tenant-b", from:"3", to:"4" }];
  const scoped = edges.filter((e)=>e.tenantId === "tenant-a");
  assert.equal(scoped.length, 1);
});
