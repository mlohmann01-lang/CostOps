import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { TrustResolutionTaskRepository } from "../lib/trust/trust-resolution-task-repository";
import { TrustResolutionTaskService } from "../lib/trust/trust-resolution-task-service";
import { assignDefaultOwner, buildAccountabilityRollup, computeEscalationLevel, computeSlaStatus } from "../lib/trust/trust-accountability-engine";
import type { TrustFinding } from "../lib/trust/trust-types";

const baseNow = new Date("2026-05-30T12:00:00.000Z");

const finding = (overrides: Partial<TrustFinding> = {}): TrustFinding => ({
  findingId: "finding-1",
  tenantId: "tenant-a",
  findingType: "IDENTITY_CONFLICT",
  severity: "HIGH",
  entityType: "USER",
  entityId: "u-1",
  sourceSystem: "M365",
  description: "Identity conflict blocks execution",
  affectedRecommendationIds: ["rec-1", "rec-2"],
  affectedValue: 12400,
  status: "OPEN",
  remediationHint: "Resolve identity match",
  detectedAt: "2026-05-30T00:00:00.000Z",
  ...overrides,
});

function setup() {
  const repo = new TrustResolutionTaskRepository();
  repo.clearForTests();
  return { repo, service: new TrustResolutionTaskService(repo) };
}

test("default owner assignment by finding type", () => {
  assert.equal(assignDefaultOwner("IDENTITY_CONFLICT").ownerName, "IAM Team");
  assert.equal(assignDefaultOwner("MISSING_OWNER").ownerName, "IT Asset Management");
  assert.equal(assignDefaultOwner("UNKNOWN_COST_CENTRE").ownerName, "Finance Operations");
  assert.equal(assignDefaultOwner("SOMETHING_NEW").ownerName, "Governance Operations");
});

test("SLA dueAt calculation by priority", () => {
  const { service } = setup();
  const high = service.createFromFinding({ tenantId: "tenant-a", finding: finding({ severity: "HIGH" }), now: baseNow }).task;
  const medium = service.createFromFinding({ tenantId: "tenant-a", finding: finding({ findingId: "finding-2", severity: "MEDIUM" }), now: baseNow }).task;
  const low = service.createFromFinding({ tenantId: "tenant-a", finding: finding({ findingId: "finding-3", severity: "LOW" }), now: baseNow }).task;
  assert.equal(high.slaHours, 24);
  assert.equal(high.dueAt, "2026-05-31T12:00:00.000Z");
  assert.equal(medium.slaHours, 72);
  assert.equal(low.slaHours, 168);
});

test("ON_TRACK / AT_RISK / OVERDUE calculation", () => {
  const task = { status: "OPEN" as const, dueAt: "2026-05-31T12:00:00.000Z", slaHours: 24 };
  assert.equal(computeSlaStatus(task, new Date("2026-05-31T05:00:00.000Z")), "ON_TRACK");
  assert.equal(computeSlaStatus(task, new Date("2026-05-31T07:00:00.000Z")), "AT_RISK");
  assert.equal(computeSlaStatus(task, new Date("2026-05-31T13:00:00.000Z")), "OVERDUE");
});

test("escalation level calculation", () => {
  const task = { status: "OPEN" as const, dueAt: "2026-05-30T12:00:00.000Z", slaHours: 24 };
  assert.equal(computeEscalationLevel(task, new Date("2026-05-30T13:00:00.000Z")), "MANAGER");
  assert.equal(computeEscalationLevel(task, new Date("2026-06-01T00:00:00.000Z")), "DIRECTOR");
  assert.equal(computeEscalationLevel(task, new Date("2026-06-03T13:00:00.000Z")), "EXECUTIVE");
});

test("assigning owner updates task", () => {
  const { service } = setup();
  const created = service.createFromFinding({ tenantId: "tenant-a", finding: finding(), now: baseNow });
  const assigned = service.assign({ tenantId: "tenant-a", taskId: created.task.taskId, ownerId: "platform-ops", ownerName: "Platform Operations", ownerType: "TEAM", now: baseNow });
  assert.equal(assigned?.task.ownerName, "Platform Operations");
  assert.equal(assigned?.task.accountabilityStatus, "ASSIGNED");
  assert.equal(assigned?.events[0].eventType, "TRUST_TASK_ASSIGNED");
});

test("escalating task updates task", () => {
  const { service } = setup();
  const created = service.createFromFinding({ tenantId: "tenant-a", finding: finding(), now: baseNow });
  const escalated = service.escalate({ tenantId: "tenant-a", taskId: created.task.taskId, escalationLevel: "DIRECTOR", reason: "Blocked value aging", now: baseNow });
  assert.equal(escalated?.task.escalationLevel, "DIRECTOR");
  assert.equal(escalated?.task.accountabilityStatus, "ESCALATED");
  assert.equal(escalated?.events[0].eventType, "TRUST_TASK_ESCALATED");
});

test("resolved task does not escalate", () => {
  const { service } = setup();
  const created = service.createFromFinding({ tenantId: "tenant-a", finding: finding(), now: baseNow });
  service.setStatus({ tenantId: "tenant-a", taskId: created.task.taskId, status: "RESOLVED", now: baseNow });
  const escalated = service.escalate({ tenantId: "tenant-a", taskId: created.task.taskId, now: new Date("2026-06-04T12:00:00.000Z") });
  assert.equal(escalated?.error, "TRUST_TASK_CLOSED");
  assert.equal(service.get("tenant-a", created.task.taskId, new Date("2026-06-04T12:00:00.000Z"))?.escalationLevel, "NONE");
});

test("accountability rollup totals", () => {
  const { service } = setup();
  const overdue = service.createFromFinding({ tenantId: "tenant-a", finding: finding(), now: new Date("2026-05-29T12:00:00.000Z") }).task;
  service.createFromFinding({ tenantId: "tenant-a", finding: finding({ findingId: "finding-2", severity: "MEDIUM", affectedValue: 7200 }), now: new Date("2026-05-30T00:00:00.000Z") });
  const rollup = buildAccountabilityRollup(service.list("tenant-a", new Date("2026-05-30T18:00:00.000Z")), new Date("2026-05-30T18:00:00.000Z"));
  assert.equal(overdue.priority, "HIGH");
  assert.equal(rollup.openTasks, 2);
  assert.equal(rollup.overdueTasks, 1);
  assert.equal(rollup.blockedValueOverdue, 12400);
  assert.equal(rollup.highestEscalationLevel, "MANAGER");
});

test("tenant isolation", () => {
  const { service } = setup();
  const created = service.createFromFinding({ tenantId: "tenant-a", finding: finding(), now: baseNow });
  assert.equal(service.get("tenant-b", created.task.taskId), null);
  assert.equal(service.accountability("tenant-b").tasks.length, 0);
});

test("no recommendation/execution/connector mutation", async () => {
  const files = await Promise.all([
    readFile("src/lib/trust/trust-resolution-task-service.ts", "utf8"),
    readFile("src/lib/trust/trust-resolution-task-repository.ts", "utf8"),
    readFile("src/lib/trust/trust-accountability-engine.ts", "utf8"),
  ]);
  const body = files.join("\n");
  assert.equal(/governedRecommendationsTable|executionRequestsTable|executionResultsTable|connectorSyncStatusTable|assignLicense|removeUserLicenses|\.delete\(/.test(body), false);
});
