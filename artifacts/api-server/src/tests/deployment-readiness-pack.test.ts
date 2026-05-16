import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("runtime env validation script checks required env vars", () => {
  const scriptPath = path.resolve(process.cwd(), "../scripts/validate-runtime-env.ts");
  const src = fs.readFileSync(scriptPath, "utf8");
  assert.equal(src.includes("DATABASE_URL is required"), true);
  assert.equal(src.includes("DEMO_MODE must be explicitly set"), true);
});

test("customer demo seed refuses when DEMO_MODE is not true", () => {
  const seedPath = path.resolve(process.cwd(), "../scripts/seed-customer-demo-m365.ts");
  const src = fs.readFileSync(seedPath, "utf8");
  assert.equal(src.includes('process.env.DEMO_MODE !== "true"'), true);
  assert.equal(src.includes("demo mode only — no external execution"), true);
});

test("readiness endpoint returns required keys", () => {
  const healthPath = path.resolve(process.cwd(), "src/routes/health.ts");
  const src = fs.readFileSync(healthPath, "utf8");
  for (const key of ["ok", "dbConnected", "requiredTablesPresent", "buildArtifactsPresent", "demoMode", "timestamp"]) {
    assert.equal(src.includes(key), true);
  }
});

test("smoke script is read-only and does not call execution endpoints", () => {
  const smokePath = path.resolve(process.cwd(), "../scripts/smoke-m365-demo.ts");
  const src = fs.readFileSync(smokePath, "utf8");
  assert.equal(src.includes('method: "GET"'), true);
  assert.equal(src.includes("/api/execution/"), false);
  assert.equal(src.includes("POST"), false);
});
