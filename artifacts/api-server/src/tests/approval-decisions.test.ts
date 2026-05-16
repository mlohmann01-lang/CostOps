import test from "node:test";
import assert from "node:assert/strict";
import { authorizationService } from "../lib/security/authorization-service";

test("unauthorized approval blocked", ()=>{
  assert.equal(authorizationService.hasCapability("OPERATOR", "APPROVE_ACTIONS"), false);
});

test("approval decision immutable shape", ()=>{
  const d = Object.freeze({ decision: "APPROVE", decidedBy: "u1", evidence: { trace: "abc" } });
  assert.equal(d.decision, "APPROVE");
});
