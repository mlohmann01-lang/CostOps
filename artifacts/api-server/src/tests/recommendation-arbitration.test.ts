import test from "node:test";
import assert from "node:assert/strict";
import { RecommendationArbitrationService } from "../lib/recommendations/recommendation-arbitration-service";

test("priority score deterministic", () => {
  const service: any = new RecommendationArbitrationService();
  const rec = { id: 1, expectedMonthlySaving: 200, monthlyCost: 200, trustScore: 0.8, executionStatus: "APPROVAL_REQUIRED", recommendationRiskClass: "B", actionType: "REMOVE_LICENSE", pricingConfidence: "VERIFIED_CONTRACT", daysSinceActivity: 150, criticalBlockers: [], status: "pending", recommendationStatus: "CANDIDATE", connectorHealth: "HEALTHY", playbookId: "p", connector: "m365", createdAt: new Date(), targetEntityId: "u1" };
  const a = service.scoreRow("default", rec);
  const b = service.scoreRow("default", rec);
  assert.equal(a.priorityScore, b.priorityScore);
  assert.equal(a.priorityBand, b.priorityBand);
});

test("hard suppression works for quarantined and no economic value", () => {
  const service: any = new RecommendationArbitrationService();
  const rec = service.scoreRow("default", { id: 2, expectedMonthlySaving: 0, monthlyCost: 0, trustScore: 0.7, executionStatus: "ALLOW", recommendationRiskClass: "C", actionType: "RIGHTSIZE_LICENSE", pricingConfidence: "INFERRED", daysSinceActivity: 10, criticalBlockers: [], status: "pending", recommendationStatus: "CANDIDATE", connectorHealth: "QUARANTINED", playbookId: "p", connector: "m365", createdAt: new Date(), targetEntityId: "u2" });
  assert.ok(rec.suppressionReasons.includes("SUPPRESSED_BY_QUARANTINED_CONNECTOR_TRUST"));
  assert.ok(rec.suppressionReasons.includes("SUPPRESSED_BY_NO_ECONOMIC_VALUE"));
});
