import test from "node:test";
import assert from "node:assert/strict";
import { aggregateM365RenewalReadiness } from "../lib/playbooks/m365-renewal-readiness";

test("renewal aggregate preserves atomic recommendations", () => {
  const rows = [{ type:"INACTIVE_RECLAIM", lifecycleState:"READY_FOR_REVIEW", projectedMonthlySavings:10, trustBand:"HIGH", realizationConfidence:"HIGH" }];
  const out = aggregateM365RenewalReadiness(rows);
  assert.equal(out.inactiveLicensedUsers, 1);
  assert.equal(rows.length, 1);
});
