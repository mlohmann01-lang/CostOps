import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import router from "../routes/execution-requests";
import recommendationsRouter from "../routes/recommendations";
import { GovernedRecommendationRepository } from "../lib/recommendations/recommendation-repository";
import { buildGovernedRecommendation } from "../lib/recommendations/recommendation-builder";

const app = express();
const repo = new GovernedRecommendationRepository();
app.use(express.json());
app.use((req: any, _res, next) => { req.tenantId = req.header("x-tenant-id") ?? "t1"; next(); });
app.use("/api/recommendations", recommendationsRouter);
app.use("/api", router);
let baseUrl = "";
let server: any;

const rec = buildGovernedRecommendation({ recommendationId: "rec-exec", tenantId: "t1", playbookId: "pb", targetEntityId: "u1", targetEntityType: "User", graphNodeIds: ["n"], graphEdgeIds: ["e"], discoveryLifecycleState: "TRUSTED", confidenceScore: 0.95, reliabilityBand: "HIGH", projectedMonthlySavings: 12, projectedAnnualSavings: 144, savingsConfidence: "HIGH", actionType: "REMOVE_LICENSE", actionRiskClass: "B", evidencePointers: ["ev1"], hasApproval: true });

test.before(async () => {
  server = app.listen(0); await new Promise((r) => server.once("listening", r));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  await repo.upsert("t1", rec, ["src"]);
});
test.after(async () => { await new Promise((r) => server.close(r)); });

test("approval-required recommendation cannot create executable request", async () => {
  const body = { requestedBy: "op", idempotencyKey: "same-key" };
  const a = await fetch(`${baseUrl}/api/recommendations/rec-exec/execution-requests`, { method: "POST", headers: { "content-type": "application/json", "x-tenant-id": "t1" }, body: JSON.stringify(body) });
  const ra = await a.json() as any;
  assert.equal(ra.executionRequest.executionState, "BLOCKED");
});

test("tenant isolation enforced", async () => {
  const res = await fetch(`${baseUrl}/api/execution-requests`, { headers: { "x-tenant-id": "other" } });
  const rows = await res.json() as any[];
  assert.equal(rows.length, 0);
});
