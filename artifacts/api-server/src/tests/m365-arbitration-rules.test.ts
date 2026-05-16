import test from "node:test";
import assert from "node:assert/strict";
import { applyM365ArbitrationPrecedence } from "../lib/recommendations/recommendation-arbitration-service";

test("full reclaim suppresses rightsize", () => {
  const out = applyM365ArbitrationPrecedence([{entityId:"u1",type:"FULL_RECLAIM"},{entityId:"u1",type:"RIGHTSIZE_E5"}]);
  assert.equal(out.suppressed.length, 1);
});
