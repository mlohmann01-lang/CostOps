import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { TrustResolutionTaskRepository } from "../lib/trust/trust-resolution-task-repository";
import { TrustResolutionTaskService } from "../lib/trust/trust-resolution-task-service";
import type { TrustFinding } from "../lib/trust/trust-types";

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

test("task created from finding", () => {
  const { service } = setup();
  const out = service.createFromFinding({ tenantId: "tenant-a", finding: finding(), owner: "owner@acme.com" });
  assert.equal(out.task.findingId, "finding-1");
  assert.equal(out.task.owner, "owner@acme.com");
  assert.equal(out.task.priority, "HIGH");
  assert.equal(out.task.unlockValue, 12400);
  assert.equal(out.events[0].eventType, "TRUST_RESOLUTION_TASK_CREATED");
});

test("duplicate task prevention", () => {
  const { service } = setup();
  const first = service.createFromFinding({ tenantId: "tenant-a", finding: finding(), owner: "owner@acme.com" });
  const second = service.createFromFinding({ tenantId: "tenant-a", finding: finding(), owner: "other@acme.com" });
  assert.equal(second.duplicate, true);
  assert.equal(second.task.taskId, first.task.taskId);
});

test("status changes emit status and resolved events", () => {
  const { service } = setup();
  const created = service.createFromFinding({ tenantId: "tenant-a", finding: finding(), owner: "owner@acme.com" });
  const progress = service.setStatus({ tenantId: "tenant-a", taskId: created.task.taskId, status: "IN_PROGRESS" });
  assert.equal(progress?.task.status, "IN_PROGRESS");
  assert.equal(progress?.events[0].eventType, "TRUST_RESOLUTION_TASK_STATUS_CHANGED");
  const resolved = service.setStatus({ tenantId: "tenant-a", taskId: created.task.taskId, status: "RESOLVED" });
  assert.equal(resolved?.task.status, "RESOLVED");
  assert.ok(resolved?.task.resolvedAt);
  assert.ok(resolved?.events.some((event) => event.eventType === "TRUST_FINDING_RESOLVED"));
});

test("tenant isolation", () => {
  const { service } = setup();
  const created = service.createFromFinding({ tenantId: "tenant-a", finding: finding(), owner: "owner@acme.com" });
  assert.equal(service.get("tenant-b", created.task.taskId), null);
  assert.equal(service.list("tenant-b").length, 0);
});

test("no recommendation or execution mutation", async () => {
  const files = await Promise.all([
    readFile("src/lib/trust/trust-resolution-task-service.ts", "utf8"),
    readFile("src/lib/trust/trust-resolution-task-repository.ts", "utf8"),
  ]);
  const body = files.join("\n");
  assert.equal(/governedRecommendationsTable|executionRequestsTable|executionResultsTable|assignLicense|removeUserLicenses|\.update\(|\.delete\(/.test(body), false);
});
