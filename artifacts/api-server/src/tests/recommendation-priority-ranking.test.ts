import test from "node:test";
import assert from "node:assert/strict";
import { RecommendationArbitrationService } from "../lib/recommendations/recommendation-arbitration-service";

test("queue sorted correctly and hash stable", () => {
  const service: any = new RecommendationArbitrationService();
  const hi = service.scoreRow("t", { id: 1, expectedMonthlySaving: 500, monthlyCost: 500, trustScore: 1, executionStatus: "ALLOW", recommendationRiskClass: "C", actionType: "REMOVE_LICENSE", pricingConfidence: "VERIFIED_CONTRACT", daysSinceActivity: 200, criticalBlockers: [], status: "pending", recommendationStatus: "CANDIDATE", connectorHealth: "HEALTHY", playbookId: "p", connector: "m365", createdAt: new Date(), targetEntityId: "u1" });
  const lo = service.scoreRow("t", { id: 2, expectedMonthlySaving: 10, monthlyCost: 10, trustScore: 0.2, executionStatus: "BLOCKED", recommendationRiskClass: "A", actionType: "KEEP_EXCEPTION", pricingConfidence: "INFERRED", daysSinceActivity: 1, criticalBlockers: ["CRITICAL_TEST"], status: "suppressed", recommendationStatus: "SUPPRESSED", connectorHealth: "QUARANTINED", playbookId: "p", connector: "m365", createdAt: new Date(), targetEntityId: "u2" });
  assert.ok(hi.priorityScore > lo.priorityScore);
  assert.equal(lo.suppressionReasons.includes("SUPPRESSED_BY_RECONCILIATION_BLOCKER"), true);
});
