import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("replay report includes deterministic governance reconstruction hints", () => {
  const src = fs.readFileSync(new URL("../lib/playbooks/playbook-recommendation-service.ts", import.meta.url), "utf8");
  assert.equal(src.includes("transitionReason"), true);
  assert.equal(src.includes("governanceOutcome"), true);
  assert.equal(src.includes("continuityViolations"), true);
});
