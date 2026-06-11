import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { platformEventService } from "../lib/events/platform-event-service";
import { governedActionService } from "../lib/actions/governed-actions";
import { connectorSupportsCapability, createDefaultExecutionConnector, getConnectorCapabilities } from "../lib/execution/execution-connectors";
import { evaluateExecutionReadiness, governedExecutionService, type ExecutionConnector } from "../lib/execution/governed-execution";

const tenantId = "tenant-execution-test";

async function createAction(overrides: Record<string, unknown> = {}) {
  return governedActionService.create({
    tenantId,
    title: "Assign owner to unmanaged AI asset",
    domain: "AI",
    sourceType: "RECOMMENDATION",
    sourceId: "ai-asset-1",
    status: "APPROVED",
    priority: "LOW",
    readiness: "ELIGIBLE",
    ownerId: "application-owner",
    trustScore: 0.86,
    projectedAnnualValue: 1000,
    blastRadius: "LOW",
    rollbackCapability: "FULL",
    recommendationIds: ["rec-ai-owner"],
    evidenceIds: ["identity-ai-asset", "usage-current", "financial-savings", "execution-plan"],
    ...overrides,
  } as any);
}

test("connector registration and capability lookup support governed execution connectors", () => {
  governedExecutionService.clear();
  const connector = createDefaultExecutionConnector({ tenantId, connectorType: "AI", name: "AI connector" });
  governedExecutionService.registerConnector(connector);
  const connectors = governedExecutionService.listConnectors(tenantId);
  assert.equal(connectors.some((row) => row.id === connector.id), true);
  assert.equal(getConnectorCapabilities("M365").includes("REMOVE_LICENSE"), true);
  assert.equal(getConnectorCapabilities("M365").includes("RESTORE_COPILOT_LICENSE"), true);
  assert.equal(getConnectorCapabilities("M365").includes("VERIFY_LICENSE_STATE"), true);
  assert.equal(connectorSupportsCapability(connector, "RETIRE_AI_ASSET"), true);
});

test("readiness evaluation blocks or gates execution deterministically", () => {
  const action: any = { id: "a", readiness: "APPROVAL_REQUIRED", trustScore: 0.9, blastRadius: "HIGH", rollbackCapability: "NONE" };
  assert.equal(evaluateExecutionReadiness({ action, trust: true, approval: false, connector: null }).verdict, "BLOCKED");
  const degraded: ExecutionConnector = createDefaultExecutionConnector({ tenantId, connectorType: "JIRA", status: "DEGRADED" });
  assert.equal(evaluateExecutionReadiness({ action, trust: true, approval: true, connector: degraded, rollbackSupported: false }).verdict, "APPROVAL_REQUIRED");
  const connected: ExecutionConnector = createDefaultExecutionConnector({ tenantId, connectorType: "JIRA" });
  assert.equal(evaluateExecutionReadiness({ action: { ...action, readiness: "ELIGIBLE", blastRadius: "LOW", rollbackCapability: "FULL" }, trust: true, approval: true, connector: connected }).verdict, "ELIGIBLE");
  assert.equal(evaluateExecutionReadiness({ action, trust: false, approval: true, connector: connected }).verdict, "BLOCKED");
});

test("missing connector blocks execution readiness through service integration", async () => {
  governedExecutionService.clear();
  await governedActionService.clear();
  const action = await createAction();
  const readiness = await governedExecutionService.readiness(tenantId, action.id, "missing-connector", "OWNER_ASSIGN", true);
  assert.equal(readiness.verdict, "BLOCKED");
  assert.equal(readiness.reasons.includes("No connector available"), true);
});

test("dry run generation creates simulation execution and DRY_RUN evidence without real changes", async () => {
  governedExecutionService.clear();
  await governedActionService.clear();
  const action = await createAction();
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "AI" }));
  const result = await governedExecutionService.simulateExecution({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "OWNER_ASSIGN", estimatedValue: 12000, actor: "operator" });
  assert.equal(result.execution.status, "DRY_RUN");
  assert.equal(result.execution.executionMode, "SIMULATION");
  assert.equal(result.evidence.evidenceType, "DRY_RUN");
  assert.equal((result.evidence.payload as any).expectedChange, "OWNER_ASSIGN");
  assert.equal((result.evidence.payload as any).rollbackAvailable, true);
  const updated = await governedActionService.get(tenantId, action.id);
  assert.equal(updated?.latestExecutionId, result.execution.id);
  assert.equal(updated?.dryRunAvailable, true);
});

test("controlled execution creates pre-state, result, post-state evidence and action linkage", async () => {
  governedExecutionService.clear();
  await governedActionService.clear();
  const action = await createAction();
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "SERVICENOW" }));
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: true, actor: "operator" });
  assert.equal(result.execution.status, "COMPLETED");
  assert.equal(result.execution.rollbackSupported, true);
  assert.deepEqual(result.evidence.map((row) => row.evidenceType), ["PRE_STATE", "EXECUTION_RESULT", "POST_STATE"]);
  assert.equal((result.evidence[1].payload as any).autonomous, false);
  const listed = governedExecutionService.listEvidence(tenantId, result.execution.id);
  assert.equal(listed.length, 3);
  const updated = await governedActionService.get(tenantId, action.id);
  assert.equal(updated?.executionStatus, "COMPLETED");
  assert.equal(updated?.latestExecutionId, result.execution.id);
});

test("outcome ledger platform events are emitted for dry run and controlled execution", async () => {
  governedExecutionService.clear();
  await governedActionService.clear();
  const uniqueTenant = `${tenantId}-${Date.now()}`;
  const action = await governedActionService.create({ tenantId: uniqueTenant, title: "Create governance ticket", domain: "OTHER", sourceType: "MANUAL", sourceId: "manual", ownerId: "it-owner", status: "APPROVED", priority: "LOW", readiness: "ELIGIBLE", trustScore: 1, projectedAnnualValue: 1000, blastRadius: "LOW", rollbackCapability: "FULL", evidenceIds: ["identity-manual", "usage-current", "financial-saving", "execution-plan"] });
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId: uniqueTenant, connectorType: "JIRA" }));
  const dryRun = await governedExecutionService.simulateExecution({ tenantId: uniqueTenant, actionId: action.id, connectorId: connector.id, executionType: "TICKET_CREATE" });
  const execution = await governedExecutionService.executeGovernedAction({ tenantId: uniqueTenant, actionId: action.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: true });
  const dryEvents = await platformEventService.listByEntity(uniqueTenant, "GovernedExecution", dryRun.execution.id);
  const execEvents = await platformEventService.listByEntity(uniqueTenant, "GovernedExecution", execution.execution.id);
  assert.equal(dryEvents.some((event) => event.type === "EXECUTION_DRY_RUN"), true);
  assert.equal(execEvents.some((event) => event.type === "EXECUTION_PLANNED"), true);
  assert.equal(execEvents.some((event) => event.type === "EXECUTION_STARTED"), true);
  assert.equal(execEvents.some((event) => event.type === "EXECUTION_COMPLETED"), true);
});

test("tenant isolation prevents cross-tenant execution and evidence reads", async () => {
  governedExecutionService.clear();
  await governedActionService.clear();
  const action = await createAction();
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "JIRA" }));
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: true });
  assert.equal(governedExecutionService.getExecution("other-tenant", result.execution.id), null);
  assert.equal(governedExecutionService.listEvidence("other-tenant", result.execution.id).length, 0);
});

test("governed execution is not autonomous and disallows high-risk v1 license removal", async () => {
  governedExecutionService.clear();
  await governedActionService.clear();
  const action = await createAction({ status: "READY", readiness: "APPROVAL_REQUIRED" });
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "M365" }));
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "LICENSE_REMOVE", approved: true }), /EXECUTION_TYPE_NOT_ALLOWED_V1/);
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: false }), /APPROVAL_AUTHORITY_REQUIRED|READINESS_AUTHORITY_APPROVAL_REQUIRED|EXECUTION_APPROVAL_REQUIRED/);
});

test("governed execution contains no LeftShield security objects", () => {
  const model = fs.readFileSync(path.join(process.cwd(), "src/lib/execution/governed-execution.ts"), "utf8");
  const route = fs.readFileSync(path.join(process.cwd(), "src/routes/execution.ts"), "utf8");
  assert.equal(model.includes("LeftShield"), false);
  assert.equal(route.includes("LeftShield"), false);
  assert.equal(model.includes("autonomous: false"), true);
});

test("execution creation can be retrieved by execution id", async () => {
  governedExecutionService.clear();
  await governedActionService.clear();
  const action = await createAction();
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "JIRA" }));
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: true });
  assert.equal(governedExecutionService.getExecution(tenantId, result.execution.id)?.id, result.execution.id);
});

test("pre-state evidence is captured before controlled execution", async () => {
  governedExecutionService.clear();
  await governedActionService.clear();
  const action = await createAction();
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "JIRA" }));
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: true });
  assert.equal(result.evidence.some((row) => row.evidenceType === "PRE_STATE" && row.summary.includes("Pre-state")), true);
});

test("post-state evidence is captured after controlled execution", async () => {
  governedExecutionService.clear();
  await governedActionService.clear();
  const action = await createAction();
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "JIRA" }));
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: true });
  assert.equal(result.evidence.some((row) => row.evidenceType === "POST_STATE" && row.summary.includes("Post-state")), true);
});

test("rollback metadata is retained on dry runs and executions", async () => {
  governedExecutionService.clear();
  await governedActionService.clear();
  const action = await createAction({ rollbackCapability: "NONE" });
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "JIRA" }));
  const dryRun = await governedExecutionService.simulateExecution({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "TICKET_CREATE" });
  assert.equal(dryRun.execution.rollbackSupported, false);
  assert.equal((dryRun.evidence.payload as any).rollbackAvailable, false);
});
