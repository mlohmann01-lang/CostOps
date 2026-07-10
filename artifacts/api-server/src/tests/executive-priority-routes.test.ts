import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ExecutivePriorityRepository } from "../lib/prioritization/executive-priority-repository";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";

function seedOpportunity(tenantId: string, id: string) {
  new OpportunityRepository().upsert(tenantId, {
    id, tenantId, source: "TRUST", sourceReferenceId: id, title: `Opportunity ${id}`, description: "test fixture",
    domain: "AWS", projectedMonthlySavings: 1000, projectedAnnualSavings: 12000, confidenceScore: 80, trustScore: 80,
    readiness: "ELIGIBLE", status: "DISCOVERED", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", urgency: "MEDIUM",
  });
}

test("repository is tenant scoped and read-only", () => {
  seedOpportunity("tenant-a", "opp-a-1");
  seedOpportunity("tenant-b", "opp-b-1");
  const repo = new ExecutivePriorityRepository();
  const tenantA = repo.listPriorities("tenant-a");
  const tenantB = repo.listPriorities("tenant-b");
  assert.equal(tenantA.length, tenantB.length);
  assert.equal(tenantA[0].tenantId, "tenant-a");
  assert.equal(tenantB[0].tenantId, "tenant-b");
  assert.equal(repo.getSummary("tenant-a").tenantId, "tenant-a");
});

test("routes register summary and top before id with no mutation endpoints", async () => {
  const routes = await readFile("src/routes/priorities.ts", "utf8");
  const index = await readFile("src/routes/index.ts", "utf8");
  assert.equal(index.includes('/priorities'), true);
  assert.ok(routes.indexOf('router.get("/summary"') < routes.indexOf('router.get("/:id"'));
  assert.ok(routes.indexOf('router.get("/top"') < routes.indexOf('router.get("/:id"'));
  assert.equal(/router\.(post|put|patch|delete)/.test(routes), false);
});
