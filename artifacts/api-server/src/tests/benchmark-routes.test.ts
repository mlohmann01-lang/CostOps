import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { BenchmarkRepository } from "../lib/benchmarks/benchmark-repository";

test("repository supports listing, high-impact gaps, lookup, and tenant isolation", () => {
  const repo = new BenchmarkRepository();
  repo.clearForTests();
  assert.ok(repo.list("tenant-a").length >= 5);
  assert.ok(repo.highImpact("tenant-a").length >= 1);
  assert.equal(repo.getById("tenant-b", "missing"), null);
  assert.ok(repo.list("tenant-a").every((row) => row.tenantId === "tenant-a"));
});

test("benchmark routes are read-only", async () => {
  const routes = await readFile("src/routes/benchmarks.ts", "utf8");
  const index = await readFile("src/routes/index.ts", "utf8");
  assert.equal(index.includes('/benchmarks'), true);
  assert.equal(routes.includes('router.get("/high-impact"'), true);
  assert.equal(routes.includes('router.get("/opportunities"'), true);
  assert.equal(/router\.(post|put|patch|delete)|removeUserLicenses|assignLicense|executionRequestsTable/.test(routes), false);
});
