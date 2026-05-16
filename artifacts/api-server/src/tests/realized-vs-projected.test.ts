import { test } from "node:test";
import assert from "node:assert/strict";

test("delta calculations support under/over realization", () => {
  const projected = 100;
  const realized = 80;
  const delta = realized - projected;
  const deltaPercent = (delta / projected) * 100;
  assert.equal(delta, -20);
  assert.equal(deltaPercent, -20);
});

test("confidence calibration deterministic mapping", () => {
  const classify = (p: number) => (p < -20 ? "CONFIDENCE_OVERSTATED" : p > 20 ? "CONFIDENCE_UNDERSTATED" : "CONFIDENCE_ACCURATE");
  assert.equal(classify(-30), "CONFIDENCE_OVERSTATED");
  assert.equal(classify(30), "CONFIDENCE_UNDERSTATED");
  assert.equal(classify(0), "CONFIDENCE_ACCURATE");
});
