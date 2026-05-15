import { db, executionAutomationCandidatesTable, executionBatchesTable, executionEscalationsTable, executionOrchestrationPlansTable, executionQueueItemsTable } from "@workspace/db";

const tenantId = process.env.DEMO_TENANT_ID ?? "demo-tenant";
const actorId = "demo-seed";
const correlationPrefix = `demo-${Date.now()}`;

async function run() {
  const [readyPlan] = await db.insert(executionOrchestrationPlansTable).values({ tenantId, planType: "DEMO", status: "READY", createdByActorId: actorId, correlationId: `${correlationPrefix}-plan-ready`, sourceRecommendationIds: ["DEMO_ONLY"] }).returning();
  const [waitingPlan] = await db.insert(executionOrchestrationPlansTable).values({ tenantId, planType: "DEMO", status: "WAITING_DEPENDENCIES", createdByActorId: actorId, correlationId: `${correlationPrefix}-plan-waiting`, sourceRecommendationIds: ["DEMO_ONLY"] }).returning();
  await db.insert(executionQueueItemsTable).values([
    { tenantId, planId: readyPlan.id, recommendationId: "DEMO-READY", actionType: "NOOP_DEMO", targetEntityId: "entity-ready", targetEntityType: "demo", status: "READY", riskClass: "A", correlationId: `${correlationPrefix}-q-ready`, rollbackAvailable: true, executionResult: { demo: true, marker: "NO_EXECUTION" } },
    { tenantId, planId: waitingPlan.id, recommendationId: "DEMO-BLOCKED", actionType: "NOOP_DEMO", targetEntityId: "entity-blocked", targetEntityType: "demo", status: "BLOCKED", riskClass: "B", correlationId: `${correlationPrefix}-q-blocked`, failureReason: "runtime-block evidence: demo", executionResult: { demo: true, marker: "NO_EXECUTION" } }
  ]);
  await db.insert(executionBatchesTable).values({ tenantId, planId: readyPlan.id, status: "READY", readiness: "WAITING_SAMPLE_VERIFICATION", blastRadiusBand: "HIGH", isSampleBatch: true });
  await db.insert(executionAutomationCandidatesTable).values([
    { tenantId, actionType: "NOOP_DEMO", targetEntityType: "demo", promotionStatus: "READY_FOR_REVIEW", rollbackAvailable: true, promotionEvidence: { demo: true } },
    { tenantId, actionType: "NOOP_DEMO", targetEntityType: "demo", promotionStatus: "REVOKED", currentMode: "RECOMMEND_ONLY", promotionEvidence: { demo: true, revoked: true } }
  ]);
  await db.insert(executionEscalationsTable).values({ tenantId, planId: waitingPlan.id, escalationType: "SLA_BREACH", severity: "HIGH", reason: "demo sla breach", correlationId: `${correlationPrefix}-sla` });
  console.log("Seeded execution orchestration demo data", { tenantId });
}

run();
