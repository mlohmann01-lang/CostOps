import test from "node:test";
import assert from "node:assert/strict";
import { simulateM365LifecycleAwareSavings } from "../lib/simulations/policy-simulation-service";

test("simulation excludes suppressed recommendations", () => {
  const out = simulateM365LifecycleAwareSavings([
    { lifecycleState: "SUPPRESSED", projectedMonthlySavings: 100 },
    { lifecycleState: "READY_FOR_REVIEW", projectedMonthlySavings: 50 }
  ]);
  assert.equal(out.actionableSavings, 50);
});
