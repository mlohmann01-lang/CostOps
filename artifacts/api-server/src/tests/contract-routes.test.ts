import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ContractRepository } from "../lib/contracts/contract-repository";

test("repository supports listing, high-risk contracts, lookup, and tenant isolation", () => {
  const repo = new ContractRepository();
  repo.clearForTests();
  assert.equal(repo.list("tenant-a").length, 6);
  assert.ok(repo.highRisk("tenant-a").length >= 4);
  assert.equal(repo.getById("tenant-b", "missing"), null);
  assert.ok(repo.list("tenant-a").every((row) => row.tenantId === "tenant-a"));
});

test("contract routes are read-only and no execution mutation", async () => {
  for (const file of ["src/routes/contracts.ts", "src/lib/contracts/contract-intelligence-engine.ts", "src/lib/contracts/contract-opportunity-engine.ts"]) {
    const body = await readFile(file, "utf8");
    assert.equal(/router\.(post|put|patch|delete)|removeUserLicenses|assignLicense|executionRequestsTable|approveRecommendation/.test(body), false);
  }
  const index = await readFile("src/routes/index.ts", "utf8");
  assert.equal(index.includes('/contracts'), true);
});
