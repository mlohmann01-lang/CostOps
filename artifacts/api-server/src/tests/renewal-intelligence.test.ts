import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { RenewalRepository } from "../lib/renewals/renewal-repository";
import { calculateRenewalReadiness } from "../lib/renewals/renewal-readiness-engine";
import { summarizeRenewals } from "../lib/renewals/renewal-intelligence-engine";
import { generateRenewalOpportunities } from "../lib/renewals/renewal-opportunity-engine";
import { buildOpportunities } from "../lib/opportunities/opportunity-factory";

test("renewal model and seeded contracts exist", () => {
  const repo = new RenewalRepository();
  repo.clearForTests();
  const rows = repo.list("tenant-a");
  assert.equal(rows.length, 7);
  assert.ok(rows.some((row) => row.contractName === "Microsoft E5" && row.daysRemaining === 87 && row.annualSpend === 420000));
});

test("readiness scoring calculates recoverable spend and leverage", () => {
  const repo = new RenewalRepository();
  repo.clearForTests();
  const microsoft = repo.getById("tenant-a", "ren-microsoft-e5")!;
  const readiness = calculateRenewalReadiness(microsoft);
  assert.equal(readiness.recoverableSpend, 68040);
  assert.equal(readiness.negotiationLeverage, "HIGH");
  assert.ok(readiness.recommendedActions >= 7);
});

test("summary aggregates upcoming renewals, spend, recoverable value, and risk", () => {
  const repo = new RenewalRepository();
  repo.clearForTests();
  const summary = summarizeRenewals(repo.list("tenant-a"));
  assert.equal(summary.upcomingRenewals, 4);
  assert.equal(summary.highRisk, 2);
  assert.ok(summary.renewalSpend > 2000000);
  assert.ok(summary.recoverable > 180000);
});

test("renewal opportunity generation feeds opportunity factory", () => {
  const repo = new RenewalRepository();
  repo.clearForTests();
  const microsoft = repo.getById("tenant-a", "ren-microsoft-e5")!;
  const readiness = calculateRenewalReadiness(microsoft);
  const renewalOpportunities = generateRenewalOpportunities(microsoft, readiness);
  const opportunities = buildOpportunities({ renewalOpportunities });
  assert.ok(opportunities.length >= 7);
  assert.equal(opportunities[0].source, "RENEWAL");
  assert.equal(opportunities[0].sourceReferenceId, "ren-microsoft-e5");
});

test("tenant isolation", () => {
  const repo = new RenewalRepository();
  repo.clearForTests();
  assert.equal(repo.getById("tenant-b", "missing"), null);
  assert.ok(repo.list("tenant-a").every((row) => row.tenantId === "tenant-a"));
});

test("renewal routes are read-only and no execution mutation", async () => {
  for (const file of ["src/routes/renewals.ts", "src/lib/renewals/renewal-opportunity-engine.ts", "src/lib/renewals/renewal-readiness-engine.ts"]) {
    const body = await readFile(file, "utf8");
    assert.equal(/router\.(post|put|patch|delete)|executionRequestsTable|executionResultsTable|removeUserLicenses|assignLicense|approveRecommendation/.test(body), false);
  }
});
