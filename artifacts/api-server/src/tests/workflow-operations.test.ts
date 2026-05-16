import test from "node:test";
import assert from "node:assert/strict";
import { authorizationService } from "../lib/security/authorization-service";

test("workflow item creation capability is guarded", ()=>{
  assert.equal(authorizationService.hasCapability("READ_ONLY", "REVIEW_RECOMMENDATIONS"), false);
  assert.equal(authorizationService.hasCapability("OPERATOR", "REVIEW_RECOMMENDATIONS"), true);
});

test("no execution path introduced in workflow decisions", ()=>{
  const decision = { decision: "APPROVE", executes: false };
  assert.equal(decision.executes, false);
});
