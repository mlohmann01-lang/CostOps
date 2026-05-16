import test from "node:test";
import assert from "node:assert/strict";
import { RecommendationArbitrationService } from "../lib/recommendations/recommendation-arbitration-service";

test("conflict winner selected deterministically", () => {
  const service: any = new RecommendationArbitrationService();
  const a = service.scoreRow("t", { id: 1, expectedMonthlySaving: 300, monthlyCost: 300, trustScore: 0.9, executionStatus: "ALLOW", recommendationRiskClass: "C", actionType: "REMOVE_LICENSE", pricingConfidence: "VERIFIED_CONTRACT", daysSinceActivity: 200, criticalBlockers: [], status: "pending", recommendationStatus: "CANDIDATE", connectorHealth: "HEALTHY", playbookId: "p", connector: "m365", createdAt: new Date(), targetEntityId: "u1" });
  const b = service.scoreRow("t", { id: 2, expectedMonthlySaving: 30, monthlyCost: 30, trustScore: 0.5, executionStatus: "ALLOW", recommendationRiskClass: "B", actionType: "RIGHTSIZE_LICENSE", pricingConfidence: "INFERRED", daysSinceActivity: 10, criticalBlockers: [], status: "pending", recommendationStatus: "CANDIDATE", connectorHealth: "HEALTHY", playbookId: "p", connector: "m365", createdAt: new Date(), targetEntityId: "u1" });
  assert.ok(a.priorityScore > b.priorityScore);
});
