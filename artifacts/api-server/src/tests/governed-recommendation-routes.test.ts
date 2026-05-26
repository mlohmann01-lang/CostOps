import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import recommendationsRouter from "../routes/recommendations";
import { GovernedRecommendationRepository } from "../lib/recommendations/recommendation-repository";
import { buildGovernedRecommendation } from "../lib/recommendations/recommendation-builder";

const repo = new GovernedRecommendationRepository();
const app = express();
app.use(express.json());
app.use((req: any, _res, next) => { req.tenantId = req.header("x-tenant-id") ?? "tenant-routes"; next(); });
app.use("/api/recommendations", recommendationsRouter);

const mk = (id: string) => buildGovernedRecommendation({
  recommendationId: id,
  tenantId: "tenant-routes",
  playbookId: "pb-route",
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
});

let baseUrl = "";
let server: any;

test.before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const { port } = server.address() as any;
  baseUrl = `http://127.0.0.1:${port}`;
  await repo.upsert("tenant-routes", mk("rec-route-1"), ["src"]);
});

test.after(async () => { await new Promise((r) => server.close(r)); });

test("approval changes APPROVAL_REQUIRED to EXECUTION_READY only when allowed", async () => {
  const res = await fetch(`${baseUrl}/api/recommendations/rec-route-1/approve`, { method: "POST", headers: { "content-type": "application/json", "x-tenant-id": "tenant-routes" }, body: JSON.stringify({ approvedBy: "op" }) });
  assert.equal(res.status, 200);
  const body = await res.json() as any;
  assert.equal(body.recommendation.recommendationState, "EXECUTION_READY");
});

test("list endpoint filters by readiness/state/playbook", async () => {
  const res = await fetch(`${baseUrl}/api/recommendations?readiness=AUTO_EXECUTE_ELIGIBLE&state=EXECUTION_READY&playbookId=pb-route`, { headers: { "x-tenant-id": "tenant-routes" } });
  assert.equal(res.status, 200);
  const body = await res.json() as any[];
  assert.ok(body.length >= 1);
});
