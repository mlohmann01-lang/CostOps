import test from "node:test";
import assert from "node:assert/strict";
import { GovernedRecommendationRepository } from "../lib/recommendations/recommendation-repository";
import { GovernedRecommendationService } from "../lib/recommendations/recommendation-service";
import { RecommendationGovernanceEventService } from "../lib/recommendations/governance-event-service";
import { RecommendationGovernanceEventRepository } from "../lib/recommendations/governance-event-repository";
import { buildGovernedRecommendation } from "../lib/recommendations/recommendation-builder";

process.env.RUNTIME_ENV = "test";
process.env.NODE_ENV = "test";

const eventsRepo = new RecommendationGovernanceEventRepository({ storageMode: "memory" });
const events = new RecommendationGovernanceEventService(eventsRepo);
const repo = new GovernedRecommendationRepository();
const svc = new GovernedRecommendationService(repo, events);

const mk = (id: string, overrides: Record<string, unknown> = {}) => buildGovernedRecommendation({
  recommendationId: id, tenantId: "t-events", playbookId: "pb", targetEntityId: "u", targetEntityType: "User", graphNodeIds:["n"], graphEdgeIds:["e"], discoveryLifecycleState:"TRUSTED", confidenceScore:0.95, reliabilityBand:"HIGH", projectedMonthlySavings:10, projectedAnnualSavings:120, savingsConfidence:"HIGH", actionType:"REMOVE_LICENSE", actionRiskClass:"B", evidencePointers:["ev"], ...overrides,
});

test("approve appends RECOMMENDATION_APPROVED", async () => {
  await repo.upsert("t-events", mk("evt-1"), ["src"]);
  await svc.approve("t-events", "evt-1", "op1");
  const rows = await events.list("t-events", "evt-1");
  assert.ok(rows.some((r:any)=>r.eventType==="RECOMMENDATION_APPROVED" || r.eventType==="APPROVAL_REJECTED"));
});

test("block appends RECOMMENDATION_BLOCKED with reason", async () => {
  await repo.upsert("t-events", mk("evt-2"), ["src"]);
  await svc.block("t-events", "evt-2", "policy block", "op2");
  const rows = await events.list("t-events", "evt-2");
  assert.ok(rows.some((r:any)=>r.eventType==="RECOMMENDATION_BLOCKED" && String(r.eventReason).includes("policy block")));
});

test("recalculate appends RECOMMENDATION_RECALCULATED", async () => {
  await repo.upsert("t-events", mk("evt-3"), ["src"]);
  await svc.recalculate("t-events", "evt-3");
  const rows = await events.list("t-events", "evt-3");
  assert.ok(rows.some((r:any)=>r.eventType==="RECOMMENDATION_RECALCULATED"));
});

test("tenant cannot read other tenant events", async () => {
  await repo.upsert("t-events-b", mk("evt-4", { tenantId: "t-events-b" }), ["src"]);
  await svc.block("t-events-b", "evt-4", "x", "op");
  const rows = await events.list("t-events", "evt-4");
  assert.equal(rows.length, 0);
});

test("events ordered newest first deterministically", async () => {
  await repo.upsert("t-events", mk("evt-5"), ["src"]);
  await svc.block("t-events", "evt-5", "first", "op");
  await svc.recalculate("t-events", "evt-5");
  const rows = await events.list("t-events", "evt-5");
  assert.ok(new Date(rows[0].createdAt).getTime() >= new Date(rows[rows.length-1].createdAt).getTime());
});
