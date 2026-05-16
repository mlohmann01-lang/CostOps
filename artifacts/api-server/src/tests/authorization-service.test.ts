import test from "node:test";
import assert from "node:assert/strict";
import { authorizationService } from "../lib/security/authorization-service";

test("unauthorized operator cannot suppress findings", ()=>{
  assert.equal(authorizationService.hasCapability("OPERATOR", "SUPPRESS_FINDINGS"), false);
});

test("unauthorized operator cannot manage policies", ()=>{
  assert.equal(authorizationService.hasCapability("OPERATOR", "MANAGE_POLICIES"), false);
});
