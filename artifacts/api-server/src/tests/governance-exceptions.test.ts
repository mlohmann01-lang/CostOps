import test from "node:test";
import assert from "node:assert/strict";
import { approveException, createExceptionRequest, evaluateExceptions, expireExceptions } from "../lib/governance/exceptions.js";
import { evaluateExecutionPolicy } from "../lib/governance/policy-engine.js";

test("governance exceptions core rules", async () => {
  await assert.rejects(() => createExceptionRequest({ tenantId: "default" }), /EXPIRES_AT_REQUIRED/);
  const r = await createExceptionRequest({ tenantId: "default", exceptionType: "RECOMMENDATION_SUPPRESSION", targetType: "USER", targetId: "u1", requestedBy: "admin@contoso.com", reason: "freeze", expiresAt: new Date(Date.now() + 86400000).toISOString() });
  assert.equal(r.status, "PENDING");
  await assert.rejects(() => approveException({ exceptionId: r.id, actorId: "admin@contoso.com" }), /SELF_APPROVAL_BLOCKED/);

  const p = await evaluateExecutionPolicy({ tenantId: "default", riskClass: "C", trustGate: "APPROVAL_REQUIRED", criticalBlockers: [] });
  assert.equal(p.decision, "BLOCK");

  const e = await evaluateExceptions({ tenantId: "default", targetId: "u1", targetType: "USER", pricingConfidence: "UNKNOWN", policyDecision: "ALLOW", riskClass: "A" });
  assert.ok(Array.isArray(e.appliedExceptionIds));

  const sweep = await expireExceptions({ tenantId: "default" });
  assert.ok(typeof sweep.expiredCount === "number");
});
