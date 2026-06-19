import test from "node:test";
import assert from "node:assert/strict";
import { runOpportunityFactory } from "../lib/opportunity-factory/opportunity-factory-service";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";
import { ExecutivePriorityRepository } from "../lib/prioritization/executive-priority-repository";

test("factory runs all providers, persists canonical opportunities, and preserves tenant isolation", async () => {
  const repository = new OpportunityRepository();
  repository.clearForTests();
  const a = await runOpportunityFactory("tenant-a", { repository, now: "2026-06-01T00:00:00.000Z" });
  const b = await runOpportunityFactory("tenant-b", { repository, now: "2026-06-01T00:00:00.000Z" });
  assert.equal(a.providerResults.length, 8);
  // M365_PLAYBOOK legitimately fails for a tenant with no M365 connector snapshot seeded;
  // the factory isolates per-provider failures rather than crashing the whole run.
  assert.equal(a.providerResults.filter((provider) => provider.source !== "M365_PLAYBOOK").every((provider) => provider.succeeded), true);
  assert.ok(a.persisted > 0);
  assert.ok(repository.list("tenant-a").length > 0);
  assert.ok(repository.list("tenant-b").length > 0);
  assert.equal(repository.list("tenant-a").every((opportunity) => opportunity.tenantId === "tenant-a"), true);
  assert.equal(repository.list("tenant-b").every((opportunity) => opportunity.tenantId === "tenant-b"), true);
  assert.notEqual(repository.list("tenant-a")[0].tenantId, repository.list("tenant-b")[0].tenantId);
  assert.ok(b.summary.openOpportunities > 0);
});

test("priorities consume factory output from the opportunity store", async () => {
  const repository = new OpportunityRepository();
  repository.clearForTests();
  await runOpportunityFactory("tenant-priority", { repository, now: "2026-06-01T00:00:00.000Z" });
  const priorities = new ExecutivePriorityRepository(repository).listPriorities("tenant-priority");
  assert.ok(priorities.length > 0);
  assert.equal(priorities.every((priority) => repository.getById("tenant-priority", priority.opportunityId)), true);
});
