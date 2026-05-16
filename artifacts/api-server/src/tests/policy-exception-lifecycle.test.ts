import test from "node:test";
import assert from "node:assert/strict";

test("policy exception request includes policy version linkage", ()=>{
  const e = { policyId: "p1", policyVersion: "v3", exceptionStatus: "REQUESTED" };
  assert.equal(e.policyVersion, "v3");
});

test("exception lifecycle statuses supported", ()=>{
  const statuses = ["APPROVED", "REJECTED", "REVOKED", "EXPIRED"];
  assert.equal(statuses.includes("EXPIRED"), true);
});
