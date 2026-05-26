import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionRuntime } from "../lib/execution/execution-runtime";
import { ExecutionRequestRepository } from "../lib/execution/execution-request-repository";
import { ExecutionDryRunRepository } from "../lib/execution/dry-run-repository";
import { GovernedRecommendationRepository } from "../lib/recommendations/recommendation-repository";
import { buildGovernedRecommendation } from "../lib/recommendations/recommendation-builder";
import { RecommendationGovernanceEventRepository } from "../lib/recommendations/governance-event-repository";
import { RecommendationGovernanceEventService } from "../lib/recommendations/governance-event-service";
import { ExecutionResultRecorder } from "../lib/execution/execution-result-recorder";

const tenantId = "t-exec";
const recommendationId = "rec-exec-runtime";
const executionRequestId = "er-exec-runtime";

const requestRepo = new ExecutionRequestRepository();
const dryRunRepo = new ExecutionDryRunRepository();
const recRepo = new GovernedRecommendationRepository();
const eventRepo = new RecommendationGovernanceEventRepository({ storageMode: "memory" });
const governance = new RecommendationGovernanceEventService(eventRepo);
const resultRecorder = new ExecutionResultRecorder();
const runtime = new ExecutionRuntime(requestRepo, dryRunRepo, recRepo, governance, resultRecorder);

const rec = buildGovernedRecommendation({ recommendationId, tenantId, playbookId: "pb", targetEntityId: "user-1", targetEntityType: "User", graphNodeIds: ["n1"], graphEdgeIds: ["e1"], discoveryLifecycleState: "TRUSTED", confidenceScore: 0.95, reliabilityBand: "HIGH", projectedMonthlySavings: 12, projectedAnnualSavings: 144, savingsConfidence: "HIGH", actionType: "REMOVE_LICENSE", actionRiskClass: "B", evidencePointers: ["ev1"], hasApproval: true });

test.before(async () => {
  await recRepo.upsert(tenantId, rec, ["src"]);
  await requestRepo.upsert({ executionRequestId, tenantId, recommendationId, playbookId: "pb", targetEntityId: "user-1", actionType: "REMOVE_LICENSE", actionRiskClass: "B", requestedBy: "op", requestedAt: new Date().toISOString(), approvedBy: "approver", approvedAt: new Date().toISOString(), executionState: "APPROVED_FOR_EXECUTION", executionMode: "MANUAL_EXECUTION", dryRunRequired: true, rollbackRequired: true, rollbackPlan: { type: "RESTORE_LICENSE_ASSIGNMENTS" }, preflightChecks: [], blockedReasons: [], evidencePointers: ["ev1"], governanceEventIds: ["1"], idempotencyKey: "idem-1", expiresAt: new Date(Date.now() + 60_000).toISOString() });
  await dryRunRepo.create({ simulationId: "sim-1", tenantId, executionRequestId, simulationState: "READY_FOR_EXECUTION", simulatedActions: [], impactedEntities: [], projectedSavingsValidated: 12, validationWarnings: [], validationErrors: [], rollbackPlan: { type: "RESTORE_LICENSE_ASSIGNMENTS" }, rollbackSupported: true, policyBlocks: [], preflightResults: [], simulatedAt: new Date() });
  await governance.emit({ tenantId, recommendationId, eventType: "RECOMMENDATION_APPROVED", actorId: "approver", actorRole: "OPERATOR" });
});

test("approved request executes successfully", async () => {
  const out = await runtime.execute(tenantId, executionRequestId, "operator");
  assert.equal(out?.executionState, "EXECUTED");
  assert.ok(String(out?.rollbackReference).length > 0);
});

test("idempotency prevents duplicate execution", async () => {
  const a = await runtime.execute(tenantId, executionRequestId, "operator");
  const b = await runtime.execute(tenantId, executionRequestId, "operator");
  assert.equal(a?.executionResultId, b?.executionResultId);
});

