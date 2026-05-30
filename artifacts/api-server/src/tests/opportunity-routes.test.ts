import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";

test("repository lists ranked opportunities and summary", () => {
  const repo = new OpportunityRepository();
  repo.clearForTests();
  const rows = repo.list("tenant-a");
  assert.equal(rows.length, 12);
  assert.equal(rows[0].rank, 1);
  assert.equal(repo.summary("tenant-a").openOpportunities, 12);
});

test("supports top, source, domain, get, and tenant isolation", () => {
  const repo = new OpportunityRepository();
  repo.clearForTests();
  assert.equal(repo.top("tenant-a", 3).length, 3);
  assert.ok(repo.getBySource("tenant-a", "TRUST").length >= 4);
  assert.ok(repo.getByDomain("tenant-a", "AWS").some((row) => row.title.includes("AWS")));
  assert.equal(repo.getById("tenant-b", "missing"), null);
});

test("opportunity routes are registered read-only", async () => {
  const routes = await readFile("src/routes/opportunities.ts", "utf8");
  const index = await readFile("src/routes/index.ts", "utf8");
  assert.equal(index.includes('/opportunities'), true);
  assert.equal(routes.includes('router.get("/top"'), true);
  assert.equal(routes.includes('router.get("/domain/:domain"'), true);
  assert.equal(/router\.(post|put|patch|delete)/.test(routes), false);
});
