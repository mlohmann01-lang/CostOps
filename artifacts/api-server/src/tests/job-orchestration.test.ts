import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

test("job orchestration files and handlers are present", () => {
  const scheduler = readFileSync(join(root, "src/lib/jobs/scheduler.ts"), "utf8");
  const registry = readFileSync(join(root, "src/lib/jobs/job-registry.ts"), "utf8");
  assert.ok(scheduler.includes("runDueJobs"));
  assert.ok(registry.includes("M365_SYNC"));
  assert.ok(registry.includes("PLAYBOOK_EVALUATION"));
  assert.ok(registry.includes("DRIFT_SCAN"));
  assert.ok(registry.includes("PRICING_REFRESH"));
});

test("outcome verification handler is wired", () => {
  const registry = readFileSync(join(root, "src/lib/jobs/job-registry.ts"), "utf8");
  assert.ok(registry.includes("OUTCOME_VERIFICATION"));
  assert.ok(registry.includes("verifyOutcome"));
});
