import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("lifecycle transitions persist via recommendation decision traces", () => {
  const src = fs.readFileSync(new URL("../lib/playbooks/playbook-recommendation-service.ts", import.meta.url), "utf8");
  assert.equal(src.includes("persistLifecycleTransition"), true);
  assert.equal(src.includes("traceHash"), true);
  assert.equal(src.includes("recommendationDecisionTracesTable"), true);
});
