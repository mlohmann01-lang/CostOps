import test from "node:test";
import assert from "node:assert/strict";
import { mapTrustSignalsFromFindings } from "../lib/reconciliation/trust-signal-mapper.js";

test("identity conflict maps to BLOCK", () => {
  const out = mapTrustSignalsFromFindings([{ findingType: "IDENTITY_CONFLICT" }]);
  assert.equal(out.recommendedTrustImpact, "BLOCK");
});

test("entitlement conflict maps to DOWNGRADE or BLOCK", () => {
  const out = mapTrustSignalsFromFindings([{ findingType: "ENTITLEMENT_CONFLICT" }]);
  assert.ok(out.recommendedTrustImpact === "DOWNGRADE" || out.recommendedTrustImpact === "BLOCK");
});

test("ownership missing maps to WARNING", () => {
  const out = mapTrustSignalsFromFindings([{ findingType: "OWNERSHIP_MISSING" }]);
  assert.equal(out.recommendedTrustImpact, "WARNING");
});
