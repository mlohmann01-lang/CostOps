import test from "node:test";
import assert from "node:assert/strict";
import { evaluateM365Governance } from "../lib/governance/m365-governance-rules";

test("legal hold blocks storage", () => {
  assert.equal(evaluateM365Governance({ legalHoldPresent: true, recommendationType: "STORAGE_REVIEW" }), "BLOCK");
});
