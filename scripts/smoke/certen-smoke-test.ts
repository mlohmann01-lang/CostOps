#!/usr/bin/env tsx
/**
 * Certen API Smoke Test
 *
 * Validates all major route groups against a running API server.
 * Uses native fetch (Node 18+). No extra dependencies.
 *
 * Environment variables:
 *   BASE_URL           – API base URL (default: http://localhost:3000)
 *   SMOKE_AUTH_TOKEN   – Bearer token for authenticated tests (optional)
 *   DEMO_MODE          – Set to "true" to indicate synthetic/demo data
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const AUTH_TOKEN = process.env.SMOKE_AUTH_TOKEN;
const DEMO_MODE = process.env.DEMO_MODE === "true";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function log(msg: string): void {
  console.log(`[SMOKE] ${msg}`);
}

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: message });
    console.log(`  ✗ ${name}: ${message}`);
  }
}

function authHeaders(): Record<string, string> {
  return AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {};
}

async function get(path: string, headers: Record<string, string> = {}): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  try {
    return await fetch(url, { method: "GET", headers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Distinguish connection refused from other errors
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed") || msg.includes("connect")) {
      throw new Error(`Connection refused — is the API server running at ${BASE_URL}? (${msg})`);
    }
    throw err;
  }
}

function assertStatus(res: Response, ...expected: number[]): void {
  if (!expected.includes(res.status)) {
    throw new Error(`Expected HTTP ${expected.join(" or ")} but got ${res.status}`);
  }
}

function assertNotStatus(res: Response, ...bad: number[]): void {
  if (bad.includes(res.status)) {
    throw new Error(`Got unexpected HTTP ${res.status} (server error)`);
  }
}

async function assertJsonField(res: Response, field: string, value: unknown): Promise<void> {
  const body = await res.json() as Record<string, unknown>;
  if (body[field] !== value) {
    throw new Error(`Expected body.${field} = ${JSON.stringify(value)}, got ${JSON.stringify(body[field])}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Test suites
// ─────────────────────────────────────────────────────────────

async function runHealthChecks(): Promise<void> {
  log("--- Health checks (no auth required) ---");

  await runTest("GET /api/healthz returns 200 with status:ok", async () => {
    const res = await get("/api/healthz");
    assertStatus(res, 200);
    await assertJsonField(res, "status", "ok");
  });

  await runTest("GET /api/health returns 200", async () => {
    const res = await get("/api/health");
    assertStatus(res, 200);
  });

  await runTest("GET /api/health/live returns 200 with status:alive", async () => {
    const res = await get("/api/health/live");
    assertStatus(res, 200);
    const body = await res.json() as Record<string, unknown>;
    if (body["status"] !== "alive") {
      throw new Error(`Expected status:"alive", got "${body["status"]}"`);
    }
  });

  await runTest("GET /api/readiness returns 200 or 503 (not 500)", async () => {
    const res = await get("/api/readiness");
    assertStatus(res, 200, 503);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/health/ready returns 200 or 503 (not 500)", async () => {
    const res = await get("/api/health/ready");
    assertStatus(res, 200, 503);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/health/dependencies returns 200 or 503 (not 500)", async () => {
    const res = await get("/api/health/dependencies");
    assertStatus(res, 200, 503);
    assertNotStatus(res, 500);
  });
}

async function runUnauthenticatedRejectionChecks(): Promise<void> {
  log("--- Auth-protected endpoints (should reject without token) ---");

  await runTest("GET /api/connectors rejects without auth (401 or 403)", async () => {
    const res = await get("/api/connectors");
    assertStatus(res, 401, 403);
  });

  await runTest("GET /api/recommendations rejects without auth (401 or 403)", async () => {
    const res = await get("/api/recommendations");
    assertStatus(res, 401, 403);
  });

  await runTest("GET /api/governance/policies rejects without auth (401 or 403)", async () => {
    const res = await get("/api/governance/policies");
    assertStatus(res, 401, 403);
  });

  await runTest("GET /api/governance/approvals rejects without auth (401 or 403)", async () => {
    const res = await get("/api/governance/approvals");
    assertStatus(res, 401, 403);
  });

  await runTest("GET /api/governance/approvals returns 200 or 401 (note: governance has own authMiddleware)", async () => {
    const res = await get("/api/governance/approvals");
    // governance.ts uses its own authMiddleware — document the actual behaviour
    assertStatus(res, 200, 401, 403);
    assertNotStatus(res, 500);
  });
}

async function runAuthenticatedCoreChecks(): Promise<void> {
  if (!AUTH_TOKEN) {
    log("--- Core operational routes (SKIPPED — no SMOKE_AUTH_TOKEN set) ---");
    return;
  }
  log("--- Core operational routes (with auth token) ---");

  const hdrs = authHeaders();

  await runTest("GET /api/connectors (authenticated) returns 200", async () => {
    const res = await get("/api/connectors", hdrs);
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/recommendations (authenticated) returns 200", async () => {
    const res = await get("/api/recommendations", hdrs);
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/recommendations/enhanced (authenticated) returns 200 or 404", async () => {
    const res = await get("/api/recommendations/enhanced", hdrs);
    // 'enhanced' is a sub-path; may not exist if no seeded data
    assertStatus(res, 200, 404);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/execution (authenticated) returns 200", async () => {
    const res = await get("/api/execution", hdrs);
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/governance/policies (authenticated) returns 200", async () => {
    const res = await get("/api/governance/policies", hdrs);
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/governance/approvals (authenticated) returns 200", async () => {
    const res = await get("/api/governance/approvals", hdrs);
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/outcomes (authenticated) returns 200", async () => {
    const res = await get("/api/outcomes", hdrs);
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/outcomes/summary (authenticated) returns 200", async () => {
    const res = await get("/api/outcomes/summary", hdrs);
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });
}

async function runProofGraphChecks(): Promise<void> {
  log("--- Proof graph routes ---");

  // economic-operations proof endpoint — no requireTenantContext/requireCapability guard
  await runTest("GET /api/economic-operations/proof/test-exec-1 returns proof structure (not 500)", async () => {
    const res = await get("/api/economic-operations/proof/test-exec-1");
    assertNotStatus(res, 500);
    // Should return PROOF_INCOMPLETE or PROOF_COMPLETE — not an unhandled error
    const body = await res.json() as Record<string, unknown>;
    const status = body["status"] as string | undefined;
    if (status !== "PROOF_INCOMPLETE" && status !== "PROOF_COMPLETE") {
      throw new Error(`Expected proof status PROOF_INCOMPLETE or PROOF_COMPLETE, got "${status}"`);
    }
  });

  await runTest("GET /api/economic-operations/proof/exec-1 uses seeded execution (not 500)", async () => {
    const res = await get("/api/economic-operations/proof/exec-1");
    assertNotStatus(res, 500);
    const body = await res.json() as Record<string, unknown>;
    if (!body["executionId"]) {
      throw new Error("Expected executionId field in proof response");
    }
  });

  await runTest("GET /api/economic-operations/command-center returns 200 (not 500)", async () => {
    const res = await get("/api/economic-operations/command-center");
    assertNotStatus(res, 500);
    assertStatus(res, 200);
  });

  await runTest("GET /api/economic-operations/metrics returns 200 (not 500)", async () => {
    const res = await get("/api/economic-operations/metrics");
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/economic-operations/alerts returns 200 (not 500)", async () => {
    const res = await get("/api/economic-operations/alerts");
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/economic-operations/jobs returns 200 (not 500)", async () => {
    const res = await get("/api/economic-operations/jobs");
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });
}

async function runVerificationRouteChecks(): Promise<void> {
  log("--- Verification routes ---");

  const hdrs = authHeaders();

  await runTest("GET /api/verification/outcomes returns 200 or 401 (not 500)", async () => {
    const res = await get("/api/verification/outcomes", hdrs);
    assertStatus(res, 200, 401, 403);
    assertNotStatus(res, 500);
  });
}

async function runMiscRouteChecks(): Promise<void> {
  log("--- Miscellaneous routes ---");

  await runTest("GET /api/auth/me returns 200 (no auth — returns null context)", async () => {
    const res = await get("/api/auth/me");
    assertStatus(res, 200);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/drift returns 200 or 401 (not 500)", async () => {
    const res = await get("/api/drift", authHeaders());
    assertStatus(res, 200, 401, 403, 404);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/packs returns 200 or 401 (not 500)", async () => {
    const res = await get("/api/packs");
    assertStatus(res, 200, 401, 403, 404);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/demo/status returns 200 (not 500)", async () => {
    const res = await get("/api/demo/status");
    assertStatus(res, 200, 404);
    assertNotStatus(res, 500);
  });

  await runTest("GET /api/execution-orchestration/observability returns 200 or 401 (not 500)", async () => {
    const res = await get("/api/execution-orchestration/observability");
    assertStatus(res, 200, 401, 403, 404);
    assertNotStatus(res, 500);
  });
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log(`Target: ${BASE_URL}`);
  if (DEMO_MODE) {
    log("NOTE: DEMO_MODE=true — responses may contain synthetic/demo data");
  }
  if (AUTH_TOKEN) {
    log("Auth token provided — authenticated tests will run");
  } else {
    log("No SMOKE_AUTH_TOKEN set — authenticated tests will be skipped");
  }
  console.log("");

  await runHealthChecks();
  console.log("");
  await runUnauthenticatedRejectionChecks();
  console.log("");
  await runAuthenticatedCoreChecks();
  console.log("");
  await runProofGraphChecks();
  console.log("");
  await runVerificationRouteChecks();
  console.log("");
  await runMiscRouteChecks();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("");
  log(`Results: ${passed}/${results.length} passed`);

  if (failed > 0) {
    log(`FAILURES (${failed}):`);
    results
      .filter((r) => !r.passed)
      .forEach((r) => log(`  - ${r.name}: ${r.error}`));
    process.exit(1);
  }

  log("All smoke tests passed.");
}

main().catch((err) => {
  log(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
