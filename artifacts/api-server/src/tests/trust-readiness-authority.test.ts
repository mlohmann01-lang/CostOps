import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { platformEventService } from "../lib/events/platform-event-service";
import { governedActionService } from "../lib/actions/governed-actions";
import { createDefaultExecutionConnector } from "../lib/execution/execution-connectors";
import { governedExecutionService } from "../lib/execution/governed-execution";
import { evaluateReadinessAuthority, trustReadinessAuthorityService, type ReadinessAuthorityContext } from "../lib/trust-readiness/trust-readiness-authority";

const tenantId = "tenant-readiness-authority-test";

async function reset() {
  trustReadinessAuthorityService.clear();
  governedExecutionService.clear();
  await governedActionService.clear();
}

async function createAction(overrides: Record<string, unknown> = {}) {
  return governedActionService.create({
    tenantId,
    title: "Governed readiness action",
    domain: "OTHER",
    sourceType: "RECOMMENDATION",
    sourceId: "object-123",
    ownerId: "application-owner",
    approverId: "governance-owner",
    status: "APPROVED",
    priority: "HIGH",
    readiness: "ELIGIBLE",
    trustScore: 0.94,
    projectedAnnualValue: 24000,
    blastRadius: "LOW",
    rollbackCapability: "FULL",
    recommendationIds: ["rec-readiness"],
    evidenceIds: ["identity-object-123", "financial-saving-123", "execution-plan-123"],
    ...overrides,
  } as any);
}

async function evaluate(overrides: Record<string, unknown> = {}, context: ReadinessAuthorityContext = {}) {
  const action = await createAction(overrides);
  const report = await evaluateReadinessAuthority(String(overrides.tenantId ?? tenantId), action.id, {
    connectorStatus: "CONNECTED",
    executionMode: "CONTROLLED",
    executionType: "TICKET_CREATE",
    rollbackSupported: true,
    approvalPresent: true,
    ...context,
  });
  return { action, report };
}

test("readiness authority report generation captures all canonical dimensions", async () => {
  await reset();
  const { action, report } = await evaluate();
  assert.equal(report.tenantId, tenantId);
  assert.equal(report.actionId, action.id);
  assert.equal(report.dimensions.length, 9);
  assert.equal(report.dimensions.some((dimension) => dimension.dimension === "CONNECTOR_TRUST"), true);
  assert.equal(report.summary.includes(report.verdict), true);
  assert.equal(trustReadinessAuthorityService.getReport(tenantId, action.id)?.id, report.id);
});

test("dimension scoring is deterministic for pass, warn, fail, and unknown states", async () => {
  await reset();
  const { report } = await evaluate({ ownerId: undefined, domain: "AI", evidenceIds: ["identity-ai-1", "financial-saving-1"] }, { connectorStatus: "DEGRADED", rollbackSupported: true });
  const byDimension = Object.fromEntries(report.dimensions.map((dimension) => [dimension.dimension, dimension]));
  assert.equal(byDimension.IDENTITY_TRUST.status, "PASS");
  assert.equal(byDimension.USAGE_TRUST.status, "FAIL");
  assert.equal(byDimension.OWNERSHIP_TRUST.status, "FAIL");
  assert.equal(byDimension.CONNECTOR_TRUST.status, "WARN");
  assert.equal(typeof byDimension.FINANCIAL_TRUST.score, "number");
});

test("missing owner causes a BLOCKED verdict and owner remediation", async () => {
  await reset();
  const { report } = await evaluate({ ownerId: undefined });
  assert.equal(report.verdict, "BLOCKED");
  assert.equal(report.blockers.some((blocker) => blocker.dimension === "OWNERSHIP_TRUST"), true);
  assert.equal(report.requiredActions.some((action) => action.actionType === "ASSIGN_OWNER"), true);
});

test("degraded connector causes APPROVAL_REQUIRED rather than bypassing governance", async () => {
  await reset();
  const { report } = await evaluate({}, { connectorStatus: "DEGRADED" });
  assert.equal(report.verdict, "APPROVAL_REQUIRED");
  assert.equal(report.requiredActions.some((action) => action.actionType === "REFRESH_CONNECTOR"), true);
});

test("high blast radius without rollback requires approval", async () => {
  await reset();
  const { report } = await evaluate({ blastRadius: "HIGH", rollbackCapability: "NONE" }, { rollbackSupported: false });
  assert.equal(report.verdict, "APPROVAL_REQUIRED");
  assert.equal(report.missingEvidence.some((evidence) => evidence.evidenceType === "ROLLBACK"), true);
});

test("unsupported execution type causes BLOCKED", async () => {
  await reset();
  const { report } = await evaluate({}, { executionType: "LICENSE_REMOVE" });
  assert.equal(report.verdict, "BLOCKED");
  assert.equal(report.blockers.some((blocker) => blocker.dimension === "EXECUTION_TRUST"), true);
});

test("all clear governed action becomes ELIGIBLE with high confidence", async () => {
  await reset();
  const { report } = await evaluate();
  assert.equal(report.verdict, "ELIGIBLE");
  assert.equal(report.confidence, "HIGH");
  const dashboard = trustReadinessAuthorityService.dashboard(tenantId);
  assert.equal(dashboard.eligible, 1);
  assert.equal(dashboard.highConfidence, 1);
});

test("missing evidence appears in the authority report", async () => {
  await reset();
  const { report } = await evaluate({ domain: "AI", evidenceIds: [] });
  assert.equal(report.missingEvidence.length > 0, true);
  assert.equal(report.missingEvidence.some((evidence) => evidence.evidenceType === "USAGE" || evidence.evidenceType === "EXECUTION"), true);
});

test("required readiness actions are generated with accountable owners", async () => {
  await reset();
  const { report } = await evaluate({ ownerId: undefined, rollbackCapability: "PARTIAL" }, { connectorStatus: "DEGRADED" });
  assert.equal(report.requiredActions.length > 0, true);
  assert.equal(report.requiredActions.some((action) => action.ownerRole === "APPLICATION_OWNER"), true);
  assert.equal(report.requiredActions.some((action) => action.ownerRole === "IT_OWNER"), true);
});

test("ledger events are persisted for evaluated and verdict-specific outcomes", async () => {
  await reset();
  const uniqueTenant = `${tenantId}-events-${Date.now()}`;
  const action = await createAction({ tenantId: uniqueTenant });
  const report = await evaluateReadinessAuthority(uniqueTenant, action.id, { connectorStatus: "DEGRADED", executionMode: "CONTROLLED", executionType: "TICKET_CREATE", approvalPresent: true, rollbackSupported: true });
  const events = await platformEventService.listByEntity(uniqueTenant, "GovernedAction", action.id);
  assert.equal(report.verdict, "APPROVAL_REQUIRED");
  assert.equal(events.some((event) => event.type === "READINESS_AUTHORITY_EVALUATED"), true);
  assert.equal(events.some((event) => event.type === "READINESS_APPROVAL_REQUIRED"), true);
});

test("GovernedAction readiness authority metadata is updated", async () => {
  await reset();
  const { action, report } = await evaluate({}, { connectorStatus: "DEGRADED" });
  const updated = await governedActionService.get(tenantId, action.id);
  assert.equal(updated?.readinessAuthorityVerdict, report.verdict);
  assert.equal(updated?.readinessAuthorityConfidence, report.confidence);
  assert.equal(updated?.readinessBlockerCount, report.blockers.length);
  assert.equal(updated?.missingEvidenceCount, report.missingEvidence.length);
  assert.equal(updated?.requiredReadinessActionCount, report.requiredActions.length);
});

test("execution cannot bypass BLOCKED or NEVER_ELIGIBLE readiness authority verdicts", async () => {
  await reset();
  const blocked = await createAction({ ownerId: undefined });
  const closed = await createAction({ id: "closed-readiness-action", status: "CLOSED" });
  const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "JIRA" }));
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: blocked.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: true }), /READINESS_AUTHORITY_DENIED:BLOCKED/);
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: closed.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: true }), /READINESS_AUTHORITY_DENIED:NEVER_ELIGIBLE/);
});

test("tenant isolation prevents cross-tenant report reads", async () => {
  await reset();
  const { action, report } = await evaluate();
  assert.equal(trustReadinessAuthorityService.getReport(tenantId, action.id)?.id, report.id);
  assert.equal(trustReadinessAuthorityService.getReport("other-tenant", action.id), null);
});

test("readiness authority does not authorize autonomous execution", async () => {
  await reset();
  const { report } = await evaluate({}, { executionMode: "AUTO_EXECUTE_SAFE" });
  assert.equal(report.verdict, "ELIGIBLE");
  const model = fs.readFileSync(path.join(process.cwd(), "src/lib/trust-readiness/trust-readiness-authority.ts"), "utf8");
  assert.equal(model.includes("autonomous: true"), false);
});

test("trust readiness authority contains no LeftShield security objects", () => {
  const model = fs.readFileSync(path.join(process.cwd(), "src/lib/trust-readiness/trust-readiness-authority.ts"), "utf8");
  const route = fs.readFileSync(path.join(process.cwd(), "src/routes/trust-readiness.ts"), "utf8");
  assert.equal(model.includes("LeftShield"), false);
  assert.equal(route.includes("LeftShield"), false);
});
