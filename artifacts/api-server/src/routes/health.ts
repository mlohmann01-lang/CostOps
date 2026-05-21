import fs from "node:fs";
import path from "node:path";
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { validateProductionConfig } from "../lib/config/production-config-validator";

const requiredTables = [
  "recommendations",
  "suppressed_recommendations",
  "execution_orchestration_plans",
  "execution_approvals",
  "execution_governance_policies",
  "execution_batches",
  "execution_outcome_verifications",
];

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", (_req, res) => res.json({ status: "ok" }));

router.get("/readiness", async (_req, res) => {
  let dbConnected = false;
  let requiredTablesPresent = false;

  try {
    const { pool } = await import("@workspace/db");
    await pool.query("select 1");
    dbConnected = true;

    const result = await pool.query(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
      [requiredTables],
    );

    const found = new Set(result.rows.map((row) => row.table_name));
    requiredTablesPresent = requiredTables.every((name) => found.has(name));
    await pool.end();
  } catch {
    dbConnected = false;
    requiredTablesPresent = false;
  }

  const buildArtifactsPresent =
    fs.existsSync(path.resolve(process.cwd(), "../lib/api-zod/dist/index.js")) &&
    fs.existsSync(path.resolve(process.cwd(), "../lib/db/dist/index.js")) &&
    fs.existsSync(path.resolve(process.cwd(), "../lib/api-client-react/dist/index.d.ts"));

  const payload = {
    ok: dbConnected && requiredTablesPresent && buildArtifactsPresent,
    dbConnected,
    requiredTablesPresent,
    buildArtifactsPresent,
    demoMode: process.env.DEMO_MODE ?? "unset",
    timestamp: new Date().toISOString(),
  };

  res.status(payload.ok ? 200 : 503).json(payload);
});

router.get("/startup-report", async (_req, res) => {
  const { startupReport } = await import("../lib/runtime/startup-report");
  return res.json(startupReport());
});

router.get("/health/live", (_req, res) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

router.get("/health/ready", async (_req, res) => {
  let dbReady = false;
  let migrationReady = false;

  try {
    const { pool } = await import("@workspace/db");
    await pool.query("select 1");
    dbReady = true;

    const result = await pool.query(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
      [["economic_operations_jobs", "distributed_locks", "operator_alerts"]],
    );
    migrationReady = result.rows.length >= 1;
  } catch {
    dbReady = false;
  }

  const configValidation = validateProductionConfig();
  const configReady = configValidation.valid || process.env.NODE_ENV !== "production";

  const ready = dbReady && configReady;
  res.status(ready ? 200 : 503).json({
    ready,
    dbReady,
    migrationReady,
    configReady,
    configWarnings: configValidation.warnings,
    timestamp: new Date().toISOString(),
  });
});

router.get("/health/dependencies", async (_req, res) => {
  const dependencies: Array<{ name: string; status: string; latencyMs?: number }> = [];

  const dbStart = Date.now();
  try {
    const { pool } = await import("@workspace/db");
    await pool.query("select 1");
    dependencies.push({ name: "postgres", status: "healthy", latencyMs: Date.now() - dbStart });
  } catch {
    dependencies.push({ name: "postgres", status: "unhealthy", latencyMs: Date.now() - dbStart });
  }

  const m365Mode = process.env.M365_GRAPH_MODE ?? "MOCK_CONNECTOR";
  dependencies.push({ name: "m365_graph", status: m365Mode === "MOCK_CONNECTOR" ? "mock" : "configured" });

  const snMode = process.env.SERVICENOW_MODE ?? "MOCK_CONNECTOR";
  dependencies.push({ name: "servicenow", status: snMode === "MOCK_CONNECTOR" ? "mock" : "configured" });

  const flexeraMode = process.env.FLEXERA_MODE ?? "MOCK_CONNECTOR";
  dependencies.push({ name: "flexera", status: flexeraMode === "MOCK_CONNECTOR" ? "mock" : "configured" });

  const allHealthy = dependencies.every((d) => d.status === "healthy" || d.status === "mock" || d.status === "configured");
  res.status(allHealthy ? 200 : 503).json({
    ok: allHealthy,
    dependencies,
    timestamp: new Date().toISOString(),
  });
});

export default router;
