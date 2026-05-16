import test from "node:test";
import assert from "node:assert/strict";
import { deterministicHash } from "../lib/recommendations/recommendation-rationale-persistence-service";

test("rationale hash changes when lineage changes", () => {
  const r1 = { recommendationStatus: "READY", lineage: { canonicalOrder: ["a", "b"] } };
  const r2 = { recommendationStatus: "READY", lineage: { canonicalOrder: ["b", "a"] } };
  assert.notEqual(deterministicHash(r1), deterministicHash(r2));
});
