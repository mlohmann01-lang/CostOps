import test from "node:test";
import assert from "node:assert/strict";
import { GovernedRecommendationRepository } from "../lib/recommendations/recommendation-repository";
import { buildGovernedRecommendation } from "../lib/recommendations/recommendation-builder";

const repo = new GovernedRecommendationRepository();
const mk = (id: string, overrides: Record<string, unknown> = {}) => buildGovernedRecommendation({
  recommendationId: id,
  tenantId: "tenant-a",
  playbookId: "pb",
  targetEntityId: "u1",
  targetEntityType: "User",
  graphNodeIds: ["n1"],
  graphEdgeIds: ["e1"],
  discoveryLifecycleState: "TRUSTED",
  confidenceScore: 0.95,
  reliabilityBand: "HIGH",
  projectedMonthlySavings: 10,
  projectedAnnualSavings: 120,
  savingsConfidence: "HIGH",
  actionType: "REMOVE_LICENSE",
  actionRiskClass: "B",
  evidencePointers: ["ev1"],
  ...overrides,
});

test("recommendation upsert creates row", async () => {
  const row = await repo.upsert("tenant-a", mk("rec-persist-1"), ["src1"]);
  assert.equal(row.recommendationId, "rec-persist-1");
});

test("second upsert merges evidence and preserves createdAt", async () => {
  const first = await repo.upsert("tenant-a", mk("rec-persist-2"), ["src1"]);
  const second = await repo.upsert("tenant-a", mk("rec-persist-2", { evidencePointers: ["ev2"] }), ["src2"]);
  assert.ok((second.evidencePointers as string[]).includes("ev1"));
  assert.ok((second.evidencePointers as string[]).includes("ev2"));
  assert.equal(new Date(second.createdAt).toISOString(), new Date(first.createdAt).toISOString());
  assert.ok(new Date(second.updatedAt).getTime() >= new Date(first.updatedAt).getTime());
});

test("tenant A cannot read tenant B recommendation", async () => {
  await repo.upsert("tenant-b", mk("rec-persist-3", { tenantId: "tenant-b" }), ["src-b"]);
  const row = await repo.getByRecommendationId("tenant-a", "rec-persist-3");
  assert.equal(row, null);
});

test("blocked recommendation cannot silently become execution ready", async () => {
  const blocked = mk("rec-persist-4", { discoveryLifecycleState: "MATCHED" });
  const first = await repo.upsert("tenant-a", blocked, ["src1"]);
  const second = await repo.upsert("tenant-a", { ...mk("rec-persist-4"), executionReadiness: "AUTO_EXECUTE_ELIGIBLE", recommendationState: "EXECUTION_READY" }, ["src2"]);
  assert.equal(first.executionReadiness, "BLOCKED");
  assert.notEqual(second.executionReadiness, "AUTO_EXECUTE_ELIGIBLE");
});

test("missing evidence remains blocked even after approval intent", async () => {
  const rec = mk("rec-persist-5", { evidencePointers: [] });
  const row = await repo.upsert("tenant-a", rec, ["src1"]);
  assert.equal(row.executionReadiness, "BLOCKED");
});
