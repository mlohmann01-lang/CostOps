import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { UtilizationRepository } from "../lib/utilization/utilization-repository";

test("repository is tenant scoped and platform filter works", () => {
  const repo = new UtilizationRepository();
  repo.clearForTests();
  const tenantA = repo.list("tenant-a");
  const tenantB = repo.list("tenant-b");
  assert.equal(tenantA.length, tenantB.length);
  assert.equal(tenantA[0].tenantId, "tenant-a");
  assert.ok(repo.byPlatform("tenant-a", "COPILOT").some((record) => record.platform === "COPILOT"));
  assert.ok(repo.low("tenant-a").every((record) => record.utilizationBand === "LOW" || record.utilizationBand === "UNUSED"));
});

test("utilization routes are registered read-only", async () => {
  const routes = await readFile("src/routes/utilization.ts", "utf8");
  const index = await readFile("src/routes/index.ts", "utf8");
  assert.equal(index.includes('/utilization'), true);
  assert.equal(routes.includes('router.get("/platform/:platform"'), true);
  assert.equal(routes.includes('router.get("/low"'), true);
  assert.equal(routes.includes('router.get("/opportunities"'), true);
  assert.equal(/router\.(post|put|patch|delete)/.test(routes), false);
});
