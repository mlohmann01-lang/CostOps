import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const body = fs.readFileSync(new URL("../pages/recommendations.tsx", import.meta.url), "utf8");

test("filters exist for state/readiness/playbook/risk", () => {
  ["state", "readiness", "playbook", "risk"].forEach((k) => assert.equal(body.includes(`const [${k}`), true));
});

test("detail fields present", () => {
  ["Discovery lifecycle", "Confidence", "Reliability", "Readiness reasons", "Blocked reasons", "Evidence pointers", "Source refs", "Graph refs"].forEach((k) => assert.equal(body.includes(k), true));
});

test("approve only when APPROVAL_REQUIRED", () => {
  assert.equal(body.includes('executionReadiness === "APPROVAL_REQUIRED"'), true);
});

test("block requires reason and recalculate exists", () => {
  assert.equal(body.includes("!canBlockRecommendation(blockReason)"), true);
  assert.equal(body.includes('"recalculate"'), true);
});

test("no Execute button exists", () => {
  assert.equal(body.includes(">Execute<"), false);
  assert.equal(body.includes("\"execute\""), false);
});
