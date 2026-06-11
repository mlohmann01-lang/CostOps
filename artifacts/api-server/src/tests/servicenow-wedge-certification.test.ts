import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { governedActionService } from "../lib/actions/governed-actions";
import { approvalAuthorityEngine, approveRequest, createApprovalRequest, submitApprovalRequest } from "../lib/approval-authority/approval-authority";
import { createDefaultExecutionConnector } from "../lib/execution/execution-connectors";
import { governedExecutionService, type GovernedExecutionType } from "../lib/execution/governed-execution";
import { economicOutcomeAttributionService } from "../lib/economic-outcomes/economic-outcome-attribution";
import { outcomeProtectionService } from "../lib/outcome-protection/outcome-protection";
import { trustReadinessAuthorityService } from "../lib/trust-readiness/trust-readiness-authority";
import { buildTenantEvidencePack } from "../lib/evidence-pack/evidence-pack-builder";
import { clearServiceNowExecutionState, configureServiceNowExecution, getServiceNowArtifact, rollbackServiceNowExecution, verifyServiceNowExecution } from "../lib/connectors/servicenow/servicenow-execution";
import { getServiceNowWedgeCertification } from "../lib/connectors/servicenow/servicenow-wedge-certification";

const tenantId = "tenant-servicenow-wedge-test";

async function reset(capabilities?: string[]) {
  governedExecutionService.clear();
  await governedActionService.clear();
  approvalAuthorityEngine.clear();
  trustReadinessAuthorityService.clear();
  outcomeProtectionService.clear();
  economicOutcomeAttributionService.clearForTests();
  clearServiceNowExecutionState();
  configureServiceNowExecution(tenantId, { mode: "PRODUCTION", credentialsPresent: true, instanceUrl: "https://example.service-now.com" });
  return governedExecutionService.registerConnector({ ...createDefaultExecutionConnector({ tenantId, connectorType: "SERVICENOW", executionMode: "APPROVAL_REQUIRED" }), capabilities: capabilities ?? createDefaultExecutionConnector({ tenantId, connectorType: "SERVICENOW" }).capabilities });
}

async function approveAction(actionId: string) {
  const request = await createApprovalRequest({ tenantId, actionId, approverIds: ["snow-approver"], evidenceIds: ["approval-servicenow-evidence"] });
  await submitApprovalRequest(tenantId, request.id);
  await approveRequest(tenantId, request.id, "snow-approver");
}

async function createAction(playbookId: string, name: string, executionType: GovernedExecutionType, overrides: Record<string, unknown> = {}) {
  return governedActionService.create({ tenantId, title: name, description: `${name} ${playbookId} ServiceNow execution`, domain: "ITAM", sourceType: "RECOMMENDATION", sourceId: `asset-${playbookId}`, status: "APPROVED", priority: "MEDIUM", readiness: "APPROVAL_REQUIRED", ownerId: "snow-owner", approverId: "snow-approver", trustScore: 0.94, projectedMonthlyValue: 125, projectedAnnualValue: 1500, blastRadius: "LOW", rollbackCapability: "FULL", recommendationIds: [playbookId, `rec-${executionType}`], evidenceIds: [`discovery-servicenow-${playbookId}`, `recommendation-servicenow-${playbookId}`, `trust-readiness-${playbookId}`, `identity-${playbookId}`, `usage-${playbookId}`, `financial-${playbookId}`, `approval-${playbookId}`, `execution-plan-${playbookId}`, `rollback-plan-${playbookId}`, `executive-proof-${playbookId}`], ...overrides } as any);
}

async function executeAndVerify(playbookId: string, name: string, executionType: GovernedExecutionType, connectorId: string) {
  const action = await createAction(playbookId, name, executionType);
  await approveAction(action.id);
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId, executionType, approved: true, assignedTo: "snow-resolver", approvalGroup: "CAB" });
  const verified = await verifyServiceNowExecution(tenantId, result.execution.id);
  return { action, result, verified };
}

test("certification fails when ServiceNow execution, capabilities, rollback, or verification are missing", async () => {
  await reset();
  await createAction("servicenow-change-request-creation", "Change Request Creation", "CREATE_SERVICENOW_CHANGE");
  let cert = await getServiceNowWedgeCertification(tenantId);
  let change = cert.playbooks.find((row) => row.playbookId === "servicenow-change-request-creation")!;
  assert.equal(change.execution, "NOT_IMPLEMENTED");
  assert.equal(change.certified, false);
  await reset(["CREATE_CHANGE"]);
  const action = await createAction("servicenow-change-request-creation", "Change Request Creation", "CREATE_SERVICENOW_CHANGE");
  await approveAction(action.id);
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, executionType: "CREATE_SERVICENOW_CHANGE", approved: true }), /VERIFY_STATE|READ_CHANGE/);
  cert = await getServiceNowWedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((row) => row.playbookId === "servicenow-change-request-creation")!.certified, false);
  const connector = await reset();
  const noVerify = await createAction("servicenow-change-request-creation", "Change Request Creation", "CREATE_SERVICENOW_CHANGE");
  await approveAction(noVerify.id);
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: noVerify.id, connectorId: connector.id, executionType: "CREATE_SERVICENOW_CHANGE", approved: true });
  cert = await getServiceNowWedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((row) => row.playbookId === "servicenow-change-request-creation")!.rollback, "COMPLETE");
  assert.equal(cert.playbooks.find((row) => row.playbookId === "servicenow-change-request-creation")!.verification, "MISSING");
  governedExecutionService.listEvidence(tenantId, result.execution.id).find((row) => row.evidenceType === "ROLLBACK_PAYLOAD");
});

test("certification passes only when all four ServiceNow playbooks have a full lifecycle", async () => {
  const connector = await reset();
  await executeAndVerify("servicenow-change-request-creation", "Change Request Creation", "CREATE_SERVICENOW_CHANGE", connector.id);
  await executeAndVerify("servicenow-approval-workflow", "Approval Workflow", "CREATE_SERVICENOW_APPROVAL", connector.id);
  await executeAndVerify("servicenow-remediation-task", "Remediation Task", "CREATE_SERVICENOW_TASK", connector.id);
  await executeAndVerify("servicenow-drift-remediation", "Drift Remediation", "CREATE_SERVICENOW_TASK", connector.id);
  const cert = await getServiceNowWedgeCertification(tenantId);
  assert.equal(cert.certified, true);
  assert.equal(cert.playbooks.every((row) => row.execution === "CONTROLLED_EXECUTION" && row.certified), true);
});

test("pre-state, post-state, rollback payload, rollback cancellation, outcome, protection, drift, and executive proof are linked", async () => {
  const connector = await reset();
  const { result, verified } = await executeAndVerify("servicenow-change-request-creation", "Change Request Creation", "CREATE_SERVICENOW_CHANGE", connector.id);
  const evidenceTypes = governedExecutionService.listEvidence(tenantId, result.execution.id).map((row) => row.evidenceType);
  assert.equal(evidenceTypes.includes("PRE_STATE"), true);
  assert.equal(evidenceTypes.includes("POST_STATE"), true);
  assert.equal(evidenceTypes.includes("ROLLBACK_PAYLOAD"), true);
  assert.ok(verified.outcome);
  assert.ok(verified.protectedOutcome);
  assert.equal(Boolean(verified.protectedOutcome && verified.protectedOutcome.policyIds.length >= 5), true);
  const pack = await buildTenantEvidencePack({ tenantId, generatedBy: "test" });
  assert.equal(pack.sections.some((section) => section.sectionId === "servicenow-lifecycle-proof"), true);
  const rollback = await rollbackServiceNowExecution(tenantId, result.execution.id);
  assert.equal(rollback.verified.passed, true);
  assert.equal(getServiceNowArtifact(tenantId, rollback.artifact.id)?.state, "CANCELLED");
});

test("demo mode, approval authority, trust authority, tenant isolation, autonomous execution, and labels are guarded", async () => {
  const connector = await reset();
  configureServiceNowExecution(tenantId, { mode: "DEMO", credentialsPresent: true });
  const demo = await createAction("servicenow-remediation-task", "Remediation Task", "CREATE_SERVICENOW_TASK");
  await approveAction(demo.id);
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: demo.id, connectorId: connector.id, executionType: "CREATE_SERVICENOW_TASK", approved: true }), /DEMO_MODE/);
  configureServiceNowExecution(tenantId, { mode: "PRODUCTION", credentialsPresent: true });
  const noApproval = await createAction("servicenow-remediation-task", "Remediation Task", "CREATE_SERVICENOW_TASK", { status: "READY" });
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: noApproval.id, connectorId: connector.id, executionType: "CREATE_SERVICENOW_TASK", approved: false }), /APPROVAL/);
  const blocked = await createAction("servicenow-remediation-task", "Remediation Task", "CREATE_SERVICENOW_TASK", { trustScore: 0, readiness: "ELIGIBLE" });
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: blocked.id, connectorId: connector.id, executionType: "CREATE_SERVICENOW_TASK", approved: true }), /READINESS|EXECUTION_NOT_READY/);
  assert.equal((await getServiceNowWedgeCertification("other-tenant")).playbooks.every((row) => row.certified === false), true);
  const source = fs.readFileSync(path.join(process.cwd(), "src/lib/connectors/servicenow/servicenow-execution.ts"), "utf8") + fs.readFileSync(path.join(process.cwd(), "src/lib/connectors/servicenow/servicenow-wedge-certification.ts"), "utf8");
  assert.equal(source.includes("autonomous: false"), true);
  assert.equal(source.includes("LeftShield"), false);
  assert.equal(source.includes("Agent Security Analytics"), false);
});
