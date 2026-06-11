import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { governedActionService } from "../lib/actions/governed-actions";
import { approvalAuthorityEngine, createApprovalRequest, submitApprovalRequest, approveRequest } from "../lib/approval-authority/approval-authority";
import { createDefaultExecutionConnector } from "../lib/execution/execution-connectors";
import { governedExecutionService, type GovernedExecutionType } from "../lib/execution/governed-execution";
import { outcomeProtectionService } from "../lib/outcome-protection/outcome-protection";
import { economicOutcomeAttributionService } from "../lib/economic-outcomes/economic-outcome-attribution";
import { trustReadinessAuthorityService } from "../lib/trust-readiness/trust-readiness-authority";
import { buildM365WedgeCertification } from "../lib/connectors/m365/m365-wedge-certification";
import { clearM365GraphExecutionState, configureM365GraphExecutionTenant, seedM365UserLicenseState, rollbackM365LicenseExecution, verifyM365Execution, readUserLicenseState } from "../lib/connectors/m365/m365-graph-execution";

const tenantId = "tenant-m365-wedge-test";
const sku = "sku-e5";

async function reset(tenant = tenantId) {
  governedExecutionService.clear();
  await governedActionService.clear();
  approvalAuthorityEngine.clear();
  trustReadinessAuthorityService.clear();
  outcomeProtectionService.clear();
  economicOutcomeAttributionService.clearForTests();
  clearM365GraphExecutionState();
  configureM365GraphExecutionTenant(tenant, { mode: "PRODUCTION", credentials: { tenantId: "fixture-tenant", clientId: "fixture-client", clientSecret: "fixture-secret" } });
  return governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId: tenant, connectorType: "M365", executionMode: "APPROVAL_REQUIRED" }));
}

async function createM365Action(playbookId: string, title: string, userId: string, overrides: Record<string, unknown> = {}) {
  return governedActionService.create({
    tenantId,
    title,
    description: `${title} ${playbookId}`,
    domain: "M365",
    sourceType: "RECOMMENDATION",
    sourceId: userId,
    status: "APPROVED",
    priority: "MEDIUM",
    readiness: "APPROVAL_REQUIRED",
    ownerId: "m365-owner",
    approverId: "m365-approver",
    trustScore: 0.93,
    projectedMonthlyValue: 30,
    projectedAnnualValue: 360,
    blastRadius: "LOW",
    rollbackCapability: "FULL",
    recommendationIds: [playbookId, `sku:${sku}`],
    evidenceIds: [`discovery-${playbookId}`, `identity-user-${playbookId}`, `usage-activity-${playbookId}`, `financial-saving-${playbookId}`, `trust-readiness-${playbookId}`, `approval-${playbookId}`, `rollback-plan-${playbookId}`, `execution-plan-${playbookId}`, `executive-proof-${playbookId}`],
    ...overrides,
  } as any);
}

async function approveAction(actionId: string) {
  const request = await createApprovalRequest({ tenantId, actionId, approverIds: ["m365-approver"], evidenceIds: ["approval-evidence"] });
  await submitApprovalRequest(tenantId, request.id);
  await approveRequest(tenantId, request.id, "m365-approver");
}

async function executeAndVerify(playbookId: string, title: string, executionType: GovernedExecutionType, userId: string, connectorId: string, skuId = sku) {
  seedM365UserLicenseState(tenantId, userId, [skuId]);
  const action = await createM365Action(playbookId, title, userId, executionType === "CONVERT_SHARED_MAILBOX_REVIEW" ? { rollbackCapability: "NONE" } : {});
  await approveAction(action.id);
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId, executionType, userId, skuId, targetSkuId: "sku-e3", approved: true });
  const verified = await verifyM365Execution(tenantId, result.execution.id);
  return { action, result, verified };
}

test("certification fails when Graph execution is missing", async () => {
  await reset();
  await createM365Action("inactive-user-licence-reclaim", "Inactive User Licence Reclaim", "user-missing-exec");
  const cert = await buildM365WedgeCertification(tenantId);
  const inactive = cert.playbooks.find((row) => row.playbookId === "inactive-user-licence-reclaim")!;
  assert.equal(inactive.execution, "NOT_IMPLEMENTED");
  assert.equal(inactive.certified, false);
});

test("certification fails when rollback is missing", async () => {
  const connector = await reset();
  seedM365UserLicenseState(tenantId, "user-no-rollback", [sku]);
  const action = await createM365Action("inactive-user-licence-reclaim", "Inactive User Licence Reclaim", "user-no-rollback");
  await approveAction(action.id);
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "ASSIGN_M365_LICENSE", userId: "user-no-rollback", targetSkuId: "sku-extra", approved: true });
  await verifyM365Execution(tenantId, result.execution.id);
  const cert = await buildM365WedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((row) => row.playbookId === "inactive-user-licence-reclaim")!.rollback, "MISSING");
});

test("certification fails when verification is missing", async () => {
  const connector = await reset();
  seedM365UserLicenseState(tenantId, "user-no-verify", [sku]);
  const action = await createM365Action("inactive-user-licence-reclaim", "Inactive User Licence Reclaim", "user-no-verify");
  await approveAction(action.id);
  await governedExecutionService.executeGovernedAction({ tenantId, actionId: action.id, connectorId: connector.id, executionType: "REMOVE_M365_LICENSE", userId: "user-no-verify", skuId: sku, approved: true });
  const cert = await buildM365WedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((row) => row.playbookId === "inactive-user-licence-reclaim")!.verification, "MISSING");
});

test("certification passes only when full lifecycle exists", async () => {
  const connector = await reset();
  await executeAndVerify("inactive-user-licence-reclaim", "Inactive User Licence Reclaim", "REMOVE_M365_LICENSE", "u-inactive", connector.id);
  await executeAndVerify("copilot-licence-reclaim", "Copilot Licence Reclaim", "REMOVE_COPILOT_LICENSE", "u-copilot", connector.id);
  await executeAndVerify("duplicate-licence-cleanup", "Duplicate Licence Cleanup", "REMOVE_M365_LICENSE", "u-duplicate", connector.id);
  await executeAndVerify("e5-rightsizing", "E5 Rightsizing", "DOWNGRADE_M365_LICENSE", "u-e5", connector.id);
  await executeAndVerify("shared-mailbox-licence-review", "Shared Mailbox Licence Review", "CONVERT_SHARED_MAILBOX_REVIEW", "u-shared", connector.id);
  const cert = await buildM365WedgeCertification(tenantId);
  assert.equal(cert.certified, true);
  assert.equal(cert.playbooks.every((row) => row.certified), true);
});

test("M365 playbooks classify controlled execution and simulated-only blocks certification", async () => {
  const connector = await reset();
  const inactive = await executeAndVerify("inactive-user-licence-reclaim", "Inactive User Licence Reclaim", "REMOVE_M365_LICENSE", "u-inactive-one", connector.id);
  const copilot = await executeAndVerify("copilot-licence-reclaim", "Copilot Licence Reclaim", "REMOVE_COPILOT_LICENSE", "u-copilot-one", connector.id);
  const duplicate = await createM365Action("duplicate-licence-cleanup", "Duplicate Licence Cleanup", "u-duplicate-sim");
  await governedExecutionService.simulateExecution({ tenantId, actionId: duplicate.id, connectorId: connector.id, executionType: "REMOVE_M365_LICENSE" });
  const e5 = await createM365Action("e5-rightsizing", "E5 Rightsizing", "u-e5-sim");
  await governedExecutionService.simulateExecution({ tenantId, actionId: e5.id, connectorId: connector.id, executionType: "DOWNGRADE_M365_LICENSE" });
  const shared = await executeAndVerify("shared-mailbox-licence-review", "Shared Mailbox Licence Review", "CONVERT_SHARED_MAILBOX_REVIEW", "u-shared-one", connector.id);
  const cert = await buildM365WedgeCertification(tenantId);
  assert.equal(cert.playbooks.find((row) => row.playbookId === "inactive-user-licence-reclaim")!.execution, "CONTROLLED_EXECUTION");
  assert.equal(cert.playbooks.find((row) => row.playbookId === "copilot-licence-reclaim")!.execution, "CONTROLLED_EXECUTION");
  assert.equal(cert.playbooks.find((row) => row.playbookId === "duplicate-licence-cleanup")!.execution, "SIMULATED_ONLY");
  assert.equal(cert.playbooks.find((row) => row.playbookId === "e5-rightsizing")!.execution, "SIMULATED_ONLY");
  assert.equal(cert.playbooks.find((row) => row.playbookId === "shared-mailbox-licence-review")!.rollback, "NOT_APPLICABLE");
  assert.equal(inactive.verified.verified && copilot.verified.verified && shared.verified.verified, true);
});

test("pre-state, post-state, rollback, verification, outcome, protection, drift, and executive proof are linked", async () => {
  const connector = await reset();
  const { result, verified } = await executeAndVerify("inactive-user-licence-reclaim", "Inactive User Licence Reclaim", "REMOVE_M365_LICENSE", "u-proof", connector.id);
  const evidenceTypes = governedExecutionService.listEvidence(tenantId, result.execution.id).map((row) => row.evidenceType);
  assert.equal(evidenceTypes.includes("PRE_STATE"), true);
  assert.equal(evidenceTypes.includes("POST_STATE"), true);
  assert.equal(evidenceTypes.includes("ROLLBACK_PAYLOAD"), true);
  assert.equal(verified.verified, true);
  assert.ok(verified.outcome);
  assert.ok(verified.protectedOutcome);
  assert.equal(verified.protectedOutcome.policyIds.includes(verified.driftPolicy.id), true);
  const cert = await buildM365WedgeCertification(tenantId);
  const inactive = cert.playbooks.find((row) => row.playbookId === "inactive-user-licence-reclaim")!;
  assert.equal(inactive.executiveProof, "COMPLETE");
});

test("rollback restores prior licence state", async () => {
  const connector = await reset();
  const { result } = await executeAndVerify("inactive-user-licence-reclaim", "Inactive User Licence Reclaim", "REMOVE_M365_LICENSE", "u-rollback", connector.id);
  assert.equal((await readUserLicenseState(tenantId, "u-rollback")).assignedLicenses.includes(sku), false);
  const rollback = await rollbackM365LicenseExecution(tenantId, result.execution.id);
  assert.equal(rollback.verified.passed, true);
  assert.equal((await readUserLicenseState(tenantId, "u-rollback")).assignedLicenses.includes(sku), true);
});

test("demo mode, approval authority, trust authority, and tenant isolation block unsafe execution", async () => {
  const connector = await reset();
  configureM365GraphExecutionTenant(tenantId, { mode: "DEMO", credentials: { tenantId: "t", clientId: "c", clientSecret: "s" } });
  seedM365UserLicenseState(tenantId, "u-demo", [sku]);
  const demoAction = await createM365Action("inactive-user-licence-reclaim", "Inactive User Licence Reclaim", "u-demo");
  await approveAction(demoAction.id);
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: demoAction.id, connectorId: connector.id, executionType: "REMOVE_M365_LICENSE", userId: "u-demo", skuId: sku, approved: true }), /DEMO_MODE/);
  configureM365GraphExecutionTenant(tenantId, { mode: "PRODUCTION", credentials: { tenantId: "t", clientId: "c", clientSecret: "s" } });
  const approvalAction = await createM365Action("inactive-user-licence-reclaim", "Inactive User Licence Reclaim", "u-approval", { status: "READY" });
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: approvalAction.id, connectorId: connector.id, executionType: "REMOVE_M365_LICENSE", userId: "u-approval", skuId: sku, approved: false }), /APPROVAL/);
  const trustAction = await createM365Action("inactive-user-licence-reclaim", "Inactive User Licence Reclaim", "u-trust", { trustScore: 0, readiness: "ELIGIBLE" });
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: trustAction.id, connectorId: connector.id, executionType: "REMOVE_M365_LICENSE", userId: "u-trust", skuId: sku, approved: true }), /READINESS|EXECUTION_NOT_READY/);
  const otherCert = await buildM365WedgeCertification("other-tenant");
  assert.equal(otherCert.certified, false);
});

test("M365 wedge implementation has no autonomous execution or out-of-scope security objects", () => {
  const model = fs.readFileSync(path.join(process.cwd(), "src/lib/connectors/m365/m365-graph-execution.ts"), "utf8");
  const cert = fs.readFileSync(path.join(process.cwd(), "src/lib/connectors/m365/m365-wedge-certification.ts"), "utf8");
  assert.equal(model.includes("autonomous: false"), true);
  assert.equal(model.includes("LeftShield"), false);
  assert.equal(cert.includes("LeftShield"), false);
});
