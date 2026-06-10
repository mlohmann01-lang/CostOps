import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GovernedActionService,
  GovernedActionTransitionError,
  attachOutcomeToAction,
  createGovernedActionFromRecommendation,
  getActionEvidenceSummary,
  governedActionService,
  transitionGovernedAction,
} from "../lib/actions/governed-actions";
import { platformEventService } from "../lib/events/platform-event-service";

const baseAction = (tenantId = "tenant-ga") => ({
  tenantId,
  title: "Reclaim unused M365 license",
  domain: "M365" as const,
  sourceType: "OPPORTUNITY" as const,
  sourceId: "opp-1",
  status: "DISCOVERED" as const,
  priority: "HIGH" as const,
  readiness: "APPROVAL_REQUIRED" as const,
  projectedMonthlyValue: 100,
  projectedAnnualValue: 1200,
  blastRadius: "LOW" as const,
  rollbackCapability: "FULL" as const,
  evidenceIds: ["rec-evidence-1"],
});

test("action creation persists canonical governed action and creation event", async () => {
  const service = new GovernedActionService();
  const action = await service.create(baseAction("tenant-create"));
  assert.equal(action.status, "DISCOVERED");
  assert.equal(action.recommendationIds.length, 0);
  assert.equal(action.evidenceIds[0], "rec-evidence-1");
  const history = await service.history("tenant-create", action.id);
  assert.equal(history[0].eventType, "CREATED");
});

test("recommendation to action conversion maps value, trust, readiness, domain, priority, and evidence", async () => {
  await governedActionService.clear();
  const action = await createGovernedActionFromRecommendation({
    tenantId: "tenant-rec",
    recommendationId: "rec-123",
    playbookName: "Disable stale M365 user license",
    connector: "microsoft-365",
    executionReadiness: "APPROVAL_REQUIRED",
    trustScore: 0.91,
    projectedMonthlySavings: 2500,
    projectedAnnualSavings: 30000,
    actionRiskClass: "C",
    evidencePointers: ["rec-evidence-123"],
    playbookEvidence: { proofReferences: ["rec-proof-1"] },
  });

  assert.equal(action.sourceType, "RECOMMENDATION");
  assert.equal(action.sourceId, "rec-123");
  assert.equal(action.domain, "M365");
  assert.equal(action.priority, "HIGH");
  assert.equal(action.readiness, "APPROVAL_REQUIRED");
  assert.equal(action.trustScore, 0.91);
  assert.equal(action.projectedAnnualValue, 30000);
  assert.deepEqual(action.recommendationIds, ["rec-123"]);
  assert.deepEqual(action.evidenceIds.sort(), ["rec-evidence-123", "rec-proof-1"].sort());
});

test("valid lifecycle transitions advance through approval, execution, verification, retention, drift, and closure", async () => {
  const service = new GovernedActionService();
  const action = await service.create(baseAction("tenant-lifecycle"));
  const transitions = ["PRIORITISED", "READY", "AWAITING_APPROVAL", "APPROVED", "QUEUED", "EXECUTING", "EXECUTED", "VERIFYING", "VERIFIED", "RETAINED", "DRIFTED", "CLOSED"] as const;
  let latest = action;
  for (const status of transitions) latest = (await service.transition(action.id, status, { tenantId: "tenant-lifecycle", actor: "tester" }))!;
  assert.equal(latest.status, "CLOSED");
  const history = await service.history("tenant-lifecycle", action.id);
  assert.equal(history.some((event) => event.eventType === "EXECUTION_STARTED"), true);
  assert.equal(history.some((event) => event.eventType === "DRIFT_DETECTED"), true);
});

test("invalid lifecycle transitions fail deterministically", async () => {
  const service = new GovernedActionService();
  const action = await service.create(baseAction("tenant-invalid"));
  await assert.rejects(() => service.transition(action.id, "EXECUTING", { tenantId: "tenant-invalid" }), GovernedActionTransitionError);
});

test("evidence aggregation combines recommendation, execution, and outcome evidence into one action set", async () => {
  const service = new GovernedActionService();
  const action = await service.create({ ...baseAction("tenant-evidence"), evidenceIds: ["rec-evidence-1", "exec-proof-1", "outcome-proof-1"] });
  const summary = await service.evidenceSummary("tenant-evidence", action.id);
  assert.equal(summary?.totalEvidence, 3);
  assert.deepEqual(summary?.bySource.RECOMMENDATION, ["rec-evidence-1"]);
  assert.deepEqual(summary?.bySource.EXECUTION, ["exec-proof-1"]);
  assert.deepEqual(summary?.bySource.OUTCOME, ["outcome-proof-1"]);
});

test("outcome attachment links outcome evidence and makes VERIFIED eligible from VERIFYING", async () => {
  const service = new GovernedActionService();
  const action = await service.create({ ...baseAction("tenant-outcome"), status: "VERIFYING" });
  const updated = await service.attachOutcome(action.id, { outcomeId: "outcome-1", evidenceIds: ["outcome-evidence-1"], actualMonthlyValue: 95, actualAnnualValue: 1140 }, { tenantId: "tenant-outcome" });
  assert.equal(updated?.status, "VERIFIED");
  assert.equal(updated?.actualAnnualValue, 1140);
  assert.equal(updated?.outcomeIds.includes("outcome-1"), true);
  assert.equal(updated?.evidenceIds.includes("outcome-evidence-1"), true);
});

test("dashboard counts are tenant scoped and include projected and verified value", async () => {
  const service = new GovernedActionService();
  await service.create({ ...baseAction("tenant-dashboard"), status: "READY", projectedAnnualValue: 1000 });
  await service.create({ ...baseAction("tenant-dashboard"), sourceId: "opp-2", status: "VERIFIED", actualAnnualValue: 800, projectedAnnualValue: 900 });
  await service.create({ ...baseAction("tenant-dashboard"), sourceId: "opp-3", status: "DISCOVERED", readiness: "BLOCKED", projectedAnnualValue: 50 });
  await service.create({ ...baseAction("other-dashboard"), status: "READY", projectedAnnualValue: 99999 });
  const dashboard = await service.dashboard("tenant-dashboard");
  assert.equal(dashboard.ready, 1);
  assert.equal(dashboard.verified, 1);
  assert.equal(dashboard.blocked, 1);
  assert.equal(dashboard.projectedValue, 1950);
  assert.equal(dashboard.verifiedValue, 800);
});

test("outcome ledger platform events are recorded for governed action lifecycle milestones", async () => {
  const service = new GovernedActionService();
  const tenantId = `tenant-ledger-${Date.now()}`;
  const action = await service.create({ ...baseAction(tenantId), status: "AWAITING_APPROVAL" });
  await service.transition(action.id, "APPROVED", { tenantId, actor: "approver" });
  const events = await platformEventService.listByEntity(tenantId, "GovernedAction", action.id);
  assert.equal(events.some((event) => event.type === "GOVERNED_ACTION_CREATED"), true);
  assert.equal(events.some((event) => event.type === "GOVERNED_ACTION_APPROVED"), true);
});

test("tenant isolation prevents cross-tenant reads and dashboard leakage", async () => {
  const service = new GovernedActionService();
  const action = await service.create({ ...baseAction("tenant-a"), status: "READY" });
  assert.equal(await service.get("tenant-b", action.id), null);
  assert.equal((await service.list("tenant-b")).length, 0);
  assert.equal((await service.dashboard("tenant-b")).ready, 0);
});

test("governed actions do not introduce LeftShield-specific security objects", () => {
  const actionModel = fs.readFileSync(path.join(process.cwd(), "src/lib/actions/governed-actions.ts"), "utf8");
  const route = fs.readFileSync(path.join(process.cwd(), "src/routes/actions.ts"), "utf8");
  assert.equal(actionModel.includes("LeftShield"), false);
  assert.equal(route.includes("LeftShield"), false);
  assert.equal(actionModel.includes("GovernedAction"), true);
});

test("exported lifecycle helpers operate on the singleton governed action service", async () => {
  await governedActionService.clear();
  const action = await governedActionService.create(baseAction("default"));
  await transitionGovernedAction(action.id, "PRIORITISED");
  await transitionGovernedAction(action.id, "READY");
  const withOutcome = await attachOutcomeToAction(action.id, { outcomeId: "outcome-default", evidenceId: "outcome-default-evidence" });
  const summary = await getActionEvidenceSummary("default", action.id);
  assert.equal(withOutcome?.outcomeIds.includes("outcome-default"), true);
  assert.equal(summary?.evidenceIds.includes("outcome-default-evidence"), true);
});
