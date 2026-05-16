import test from "node:test";
import assert from "node:assert/strict";
import { deterministicHash } from "../lib/recommendations/recommendation-rationale-persistence-service";

test("trace hash stable for deterministic stage payload", () => {
  const stageA = { stage: "EVIDENCE", stageOrder: 1, outcome: "ALLOW", reason: "OK", blocking: false, warning: false, sourceEvidenceIds: ["a", "b"] };
  const stageB = { outcome: "ALLOW", stageOrder: 1, stage: "EVIDENCE", warning: false, blocking: false, reason: "OK", sourceEvidenceIds: ["a", "b"] };
  assert.equal(deterministicHash(stageA), deterministicHash(stageB));
});
