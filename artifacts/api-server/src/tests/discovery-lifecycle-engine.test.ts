import test from "node:test";
import assert from "node:assert/strict";
import { classifyReliability, freshnessFromObservedAt, transitionLifecycle } from "../lib/discovery-intelligence/lifecycle-engine";

test("valid lifecycle transitions", () => {
  assert.equal(transitionLifecycle({ current: "DISCOVERED", target: "NORMALIZED" }).ok, true);
  assert.equal(transitionLifecycle({ current: "NORMALIZED", target: "MATCHED" }).ok, true);
  assert.equal(transitionLifecycle({ current: "MATCHED", target: "TRUSTED" }).ok, true);
});

test("invalid lifecycle transitions blocked", () => {
  const direct = transitionLifecycle({ current: "DISCOVERED", target: "TRUSTED" });
  assert.equal(direct.ok, false);
  const unresolved = transitionLifecycle({ current: "UNRESOLVED", target: "MATCHED", hasMatchingEvidence: false });
  assert.equal(unresolved.ok, false);
});

test("stale detection and reliability", () => {
  assert.equal(freshnessFromObservedAt("2000-01-01T00:00:00.000Z"), "STALE");
  assert.equal(classifyReliability(0.9), "HIGH");
  assert.equal(classifyReliability(0.7), "MEDIUM");
  assert.equal(classifyReliability(0.4), "LOW");
});
