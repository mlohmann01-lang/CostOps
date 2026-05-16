import fs from "node:fs";
import path from "node:path";
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

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

export default router;
