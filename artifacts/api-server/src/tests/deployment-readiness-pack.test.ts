import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveRepoPath, resolveSourcePath } from "./test-harness-paths";

test("runtime env validation script checks required env vars", () => {
  const scriptPath = resolveRepoPath("scripts", "validate-runtime-env.ts");
  const src = readFileSync(scriptPath, "utf8");
  assert.equal(src.includes("DATABASE_URL is required"), true);
  assert.equal(src.includes("DEMO_MODE must be explicitly set"), true);
});

test("customer demo seed refuses when DEMO_MODE is not true", () => {
  const seedPath = resolveRepoPath("scripts", "seed-customer-demo-m365.ts");
  const src = readFileSync(seedPath, "utf8");
  assert.equal(src.includes('process.env.DEMO_MODE !== "true"'), true);
  assert.equal(src.includes("demo mode only — no external execution"), true);
});

test("readiness endpoint returns required keys", () => {
  const healthPath = resolveSourcePath("routes", "health.ts");
  const src = readFileSync(healthPath, "utf8");
  for (const key of ["ok", "dbConnected", "requiredTablesPresent", "buildArtifactsPresent", "demoMode", "timestamp"]) {
    assert.equal(src.includes(key), true);
  }
});

test("smoke script is read-only and does not call execution endpoints", () => {
  const smokePath = resolveRepoPath("scripts", "smoke-m365-demo.ts");
  const src = readFileSync(smokePath, "utf8");
  assert.equal(src.includes('method: "GET"'), true);
  assert.equal(src.includes("/api/execution/"), false);
  assert.equal(src.includes("POST"), false);
});
