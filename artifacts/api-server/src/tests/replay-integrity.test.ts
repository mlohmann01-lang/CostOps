import test from "node:test";
import assert from "node:assert/strict";
import { deterministicHash, RecommendationRationalePersistenceService } from "../lib/recommendations/recommendation-rationale-persistence-service";

test("identical inputs produce identical deterministic hash", () => {
  const input = { b: 2, a: 1, nested: { y: 2, x: 1 } };
  assert.equal(deterministicHash(input), deterministicHash({ nested: { x: 1, y: 2 }, a: 1, b: 2 }));
});

test("mutated payload invalidates integrity", () => {
  const svc = new RecommendationRationalePersistenceService();
  const base = {
    recommendationStatus: "READY",
    trustBand: "MEDIUM",
    whyGenerated: { whyExists: "PLAYBOOK_MATCH" },
    whySafe: { safeStatus: "SAFE" },
    whyBlocked: {},
    whyDowngraded: {},
    trustFactors: {},
    reconciliationFactors: {},
    governanceFactors: {},
    runtimeFactors: {},
    projectedSavingsFactors: {},
    evidenceLineage: { canonicalOrder: ["a"] },
  } as any;
  const hash = deterministicHash(base);
  assert.equal(svc.validateRecommendationReplayIntegrity({ ...base, deterministicHash: hash }), "VALID");
  assert.equal(svc.validateRecommendationReplayIntegrity({ ...base, deterministicHash: hash, trustBand: "HIGH" }), "MISMATCH");
});
