import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { platformEventService } from "../lib/events/platform-event-service";
import { governedActionService } from "../lib/actions/governed-actions";
import { governedExecutionService } from "../lib/execution/governed-execution";
import { createDefaultExecutionConnector } from "../lib/execution/execution-connectors";
import { trustReadinessAuthorityService } from "../lib/trust-readiness/trust-readiness-authority";
import { approvalAuthorityEngine, createApprovalRequest, submitApprovalRequest, approveRequest, rejectRequest, expireRequest } from "../lib/approval-authority/approval-authority";

const tenantId = "tenant-approval-authority-test";
async function reset() { approvalAuthorityEngine.clear(); governedExecutionService.clear(); trustReadinessAuthorityService.clear(); await governedActionService.clear(); }
async function action(overrides: Record<string, unknown> = {}) { return governedActionService.create({ tenantId, title: "Approve Snowflake auto suspend", domain: "DATA", sourceType: "RECOMMENDATION", sourceId: "snowflake-wh", status: "READY", priority: "MEDIUM", readiness: "APPROVAL_REQUIRED", ownerId: "it-owner", trustScore: 0.92, projectedMonthlyValue: 1200, projectedAnnualValue: 14400, blastRadius: "MEDIUM", rollbackCapability: "PARTIAL", recommendationIds: ["rec-snowflake"], evidenceIds: ["identity-wh", "usage-current", "financial-saving", "rollback-plan"], ...overrides } as any); }
async function submitted(overrides: Record<string, unknown> = {}, approvers = ["approver-1"]) { const row = await action(overrides); const request = await createApprovalRequest({ tenantId, actionId: row.id, requestedBy: "operator", approverIds: approvers }); return { row, request: await submitApprovalRequest(tenantId, request.id) }; }

test("approval report generation explains approval need", async () => {
  await reset(); const row = await action(); const report = await approvalAuthorityEngine.evaluateApprovalAuthority(tenantId, row.id);
  assert.equal(report.verdict, "APPROVAL_REQUIRED");
  assert.equal(report.approvalType, "STANDARD");
  assert.equal(report.requiredApprovers, 1);
  assert.equal(report.evidenceCount > 0, true);
});

test("standard approval completes with one approver", async () => {
  await reset(); const { request } = await submitted({}, ["std-1"]); const result = await approveRequest(tenantId, request.id, "std-1", "approved");
  assert.equal(result.request.status, "APPROVED");
});

test("CAB approval requires two approvers", async () => {
  await reset(); const { row } = await submitted({ priority: "HIGH", blastRadius: "HIGH", projectedAnnualValue: 75000 }, ["cab-1", "cab-2"]); const request = approvalAuthorityEngine.listRequests(tenantId).find((item) => item.actionId === row.id)!;
  assert.equal(request.approvalType, "CAB");
  const first = await approveRequest(tenantId, request.id, "cab-1");
  assert.equal(first.request.status, "PENDING");
  const second = await approveRequest(tenantId, request.id, "cab-2");
  assert.equal(second.request.status, "APPROVED");
});

test("executive approval requires two approvers", async () => {
  await reset(); const { row } = await submitted({ priority: "CRITICAL", blastRadius: "HIGH", rollbackCapability: "NONE", projectedAnnualValue: 300000 }, ["exec-1", "exec-2"]); const request = approvalAuthorityEngine.listRequests(tenantId).find((item) => item.actionId === row.id)!;
  assert.equal(request.approvalType, "EXECUTIVE");
  await approveRequest(tenantId, request.id, "exec-1");
  const result = await approveRequest(tenantId, request.id, "exec-2");
  assert.equal(result.request.status, "APPROVED");
});

test("rejection flow rejects immediately", async () => {
  await reset(); const { request } = await submitted({}, ["rejector"]); const result = await rejectRequest(tenantId, request.id, "rejector", "missing owner signoff");
  assert.equal(result.request.status, "REJECTED");
});

test("expiry flow expires pending request", async () => {
  await reset(); const { request } = await submitted({}, ["approver"]); const expired = await expireRequest(tenantId, request.id);
  assert.equal(expired.status, "EXPIRED");
});

test("evidence requirement blocks submission without evidence", async () => {
  await reset(); const row = await action({ priority: "HIGH", blastRadius: "HIGH", evidenceIds: [] }); const request = await createApprovalRequest({ tenantId, actionId: row.id, approverIds: ["cab-1", "cab-2"], evidenceIds: [] });
  assert.equal(request.evidenceIds.length, 0);
  await assert.rejects(() => submitApprovalRequest(tenantId, request.id), /APPROVAL_EVIDENCE_REQUIRED/);
});

test("ledger events are persisted for approval lifecycle", async () => {
  await reset(); const uniqueTenant = `${tenantId}-ledger-${Date.now()}`; const row = await governedActionService.create({ tenantId: uniqueTenant, title: "Ledger approval", domain: "DATA", sourceType: "MANUAL", sourceId: "ledger", status: "READY", priority: "MEDIUM", readiness: "APPROVAL_REQUIRED", ownerId: "owner", trustScore: 0.9, projectedAnnualValue: 12000, blastRadius: "MEDIUM", rollbackCapability: "PARTIAL", evidenceIds: ["identity", "usage", "financial"] } as any);
  const request = await createApprovalRequest({ tenantId: uniqueTenant, actionId: row.id, approverIds: ["approver"] }); await submitApprovalRequest(uniqueTenant, request.id); await approveRequest(uniqueTenant, request.id, "approver");
  const events = await platformEventService.listByEntity(uniqueTenant, "ApprovalRequest", request.id);
  assert.equal(events.some((event) => event.type === "APPROVAL_REQUEST_CREATED"), true);
  assert.equal(events.some((event) => event.type === "APPROVAL_SUBMITTED"), true);
  assert.equal(events.some((event) => event.type === "APPROVAL_APPROVED"), true);
});

test("execution cannot bypass approval authority", async () => {
  await reset(); const row = await action({ status: "READY", readiness: "APPROVAL_REQUIRED" }); const connector = governedExecutionService.registerConnector(createDefaultExecutionConnector({ tenantId, connectorType: "JIRA" }));
  await assert.rejects(() => governedExecutionService.executeGovernedAction({ tenantId, actionId: row.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: true }), /APPROVAL_AUTHORITY_REQUIRED|READINESS_AUTHORITY_APPROVAL_REQUIRED/);
  const request = await createApprovalRequest({ tenantId, actionId: row.id, approverIds: ["approver"] }); await submitApprovalRequest(tenantId, request.id); await approveRequest(tenantId, request.id, "approver");
  const result = await governedExecutionService.executeGovernedAction({ tenantId, actionId: row.id, connectorId: connector.id, executionType: "TICKET_CREATE", approved: true });
  assert.equal(result.execution.status, "COMPLETED");
});

test("tenant isolation prevents cross tenant approval reads", async () => {
  await reset(); const { request } = await submitted({}, ["approver"]);
  assert.equal(approvalAuthorityEngine.getRequest("other-tenant", request.id), null);
  assert.equal((await approvalAuthorityEngine.dashboard("other-tenant")).pending, 0);
});

test("approval authority is not autonomous", async () => {
  await reset(); const { request } = await submitted({}, ["approver"]); await approveRequest(tenantId, request.id, "approver"); const events = await platformEventService.listByEntity(tenantId, "ApprovalRequest", request.id);
  assert.equal(events.some((event) => (event.metadata as any)?.autonomous === false), true);
});

test("approval authority contains no LeftShield objects", () => {
  const model = fs.readFileSync(path.join(process.cwd(), "src/lib/approval-authority/approval-authority.ts"), "utf8");
  const route = fs.readFileSync(path.join(process.cwd(), "src/routes/approval-authority.ts"), "utf8");
  assert.equal(model.includes("LeftShield"), false);
  assert.equal(route.includes("LeftShield"), false);
});
