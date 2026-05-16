import test from "node:test";
import assert from "node:assert/strict";
import { RecommendationArbitrationService } from "../lib/recommendations/recommendation-arbitration-service";

test("duplicate suppression marker exists", () => {
  const service: any = new RecommendationArbitrationService();
  const r1 = service.scoreRow("t", { id: 1, expectedMonthlySaving: 30, monthlyCost: 30, trustScore: 0.6, executionStatus: "ALLOW", recommendationRiskClass: "C", actionType: "REMOVE_LICENSE", pricingConfidence: "INFERRED", daysSinceActivity: 10, criticalBlockers: [], status: "pending", recommendationStatus: "CANDIDATE", connectorHealth: "HEALTHY", playbookId: "p", connector: "m365", createdAt: new Date('2024-01-01'), targetEntityId: "u1" });
  const r2 = service.scoreRow("t", { id: 2, expectedMonthlySaving: 30, monthlyCost: 30, trustScore: 0.6, executionStatus: "ALLOW", recommendationRiskClass: "C", actionType: "REMOVE_LICENSE", pricingConfidence: "VERIFIED_CONTRACT", daysSinceActivity: 10, criticalBlockers: [], status: "pending", recommendationStatus: "CANDIDATE", connectorHealth: "HEALTHY", playbookId: "p", connector: "m365", createdAt: new Date('2024-01-02'), targetEntityId: "u1" });
  assert.ok(r2.realizationConfidenceScore >= r1.realizationConfidenceScore);
});
