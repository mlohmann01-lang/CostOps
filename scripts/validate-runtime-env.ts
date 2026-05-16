import fs from "node:fs";
import path from "node:path";

const requiredTables = [
  "recommendations",
  "suppressed_recommendations",
  "execution_orchestration_plans",
  "execution_approvals",
  "execution_governance_policies",
  "execution_batches",
  "execution_outcome_verifications",
];

function ensureArtifact(label: string, relativePath: string) {
  const resolved = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} build output missing: ${resolved}`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (!process.env.DEMO_MODE) {
    throw new Error("DEMO_MODE must be explicitly set");
  }

  if (process.env.DEMO_MODE !== "true") {
    throw new Error("DEMO_MODE must be true for demo deployment/runtime validation");
  }

  const { pool } = await import("../lib/db/src/index.ts");

  try {
    await pool.query("select 1");

    const tableCheck = await pool.query(
      `
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_name = any($1::text[])
      `,
      [requiredTables],
    );

    const found = new Set(tableCheck.rows.map((r) => r.table_name));
    const missing = requiredTables.filter((name) => !found.has(name));
    if (missing.length > 0) {
      throw new Error(`required tables missing: ${missing.join(", ")}`);
    }

    ensureArtifact("api-zod", "lib/api-zod/dist/index.js");
    ensureArtifact("db", "lib/db/dist/index.js");
    ensureArtifact("api-client-react declaration", "lib/api-client-react/dist/index.d.ts");

    console.log("runtime env validation passed");
    console.log("graph/external connector execution disabled for demo: PASS (DEMO_MODE=true)");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("runtime env validation failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
