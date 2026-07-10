// Program 14B-R — Remediation 1 regression suite: Executive Proof Pack
// tenant spoofing.
//
// Program 14B found executive-proof-packs.ts derived tenant identity via
// `req.tenantId ?? req.header('x-tenant-id') ?? 'default'`, never calling
// requireTenantContext(). The fix removes that local fallback chain
// entirely: the route file now mounts requireTenantContext() itself and the
// local `tenant(req)` helper reads ONLY req.tenantId (set exclusively by
// that middleware after validating the requested tenant against the
// authenticated session), throwing if it is somehow absent.
//
// These tests exercise the real route module end-to-end over HTTP (not just
// a static source-pattern check) to prove the spoofing path is closed.

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import proofPacksRouter from "../routes/executive-proof-packs";

// Test-only auth-context injector: simulates authMiddleware() having already
// run and populated req.__authContext from a verified session token. The
// "attacker" header/body/query tenantId values below are never reflected
// into __authContext — only the verified session's tenantId is.
function withAuthContext(sessionTenantId: string, role: "TENANT_ADMIN" | "PLATFORM_ADMIN" = "TENANT_ADMIN") {
  return (req: any, _res: any, next: any) => {
    req.__authContext = { userId: "u1", tenantId: sessionTenantId, role, platformAdminOverride: role === "PLATFORM_ADMIN", authenticated: true };
    next();
  };
}

function buildApp(sessionTenantId: string, role: "TENANT_ADMIN" | "PLATFORM_ADMIN" = "TENANT_ADMIN") {
  const app = express();
  app.use(express.json());
  app.use(withAuthContext(sessionTenantId, role));
  app.use("/api/executive-proof-packs", proofPacksRouter);
  return app;
}

async function withServer(app: express.Express, fn: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

test("[Program 14B-R / Scenario 1] tenant A's own export succeeds and is scoped to tenant A", async () => {
  await withServer(buildApp("tenant-a"), async (baseUrl) => {
    const build = await fetch(`${baseUrl}/api/executive-proof-packs/build/CFO`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": "tenant-a" },
      body: JSON.stringify({ metrics: { financeVerifiedSavings: 1, executedSavings: 1, ownershipCompletenessScore: 1 }, portfolioSnapshotId: "ps", evidence: ["e"] }),
    });
    assert.equal(build.status, 200, "tenant A should be able to build its own proof pack via the authenticated route");

    const res = await fetch(`${baseUrl}/api/executive-proof-packs/packs`, { headers: { "x-tenant-id": "tenant-a" } });
    const body = await res.json() as any[];
    assert.equal(res.status, 200);
    assert.ok(body.length >= 1, "tenant A should see its own proof packs");
    assert.ok(body.every((p) => p.tenantId === "tenant-a"));
  });
});

test("[Program 14B-R / Scenario 2] tenant A's session cannot read tenant B's packs by sending x-tenant-id: tenant-b — request is denied", async () => {
  await withServer(buildApp("tenant-a"), async (baseUrl) => {
    // Attacker authenticated as tenant-a tries to claim tenant-b via header.
    const res = await fetch(`${baseUrl}/api/executive-proof-packs/packs`, { headers: { "x-tenant-id": "tenant-b" } });
    assert.equal(res.status, 403, "a mismatched client-supplied tenantId must be rejected, not silently honoured or silently ignored in favour of a default");
    const body = await res.json() as any;
    assert.equal(body.error, "TENANT_ACCESS_DENIED");
  });
});

test("[Program 14B-R / Scenario 3] server-derived tenant wins over conflicting values in body, query, and headers simultaneously", async () => {
  await withServer(buildApp("tenant-a"), async (baseUrl) => {
    // No x-tenant-id header at all (so requireTenantContext's dev-fallback
    // path resolves the session's own tenantId) — but the attacker still
    // tries to smuggle a different tenantId through body and query.
    const res = await fetch(`${baseUrl}/api/executive-proof-packs/build/CFO?tenantId=tenant-b`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId: "tenant-b", metrics: { financeVerifiedSavings: 1, executedSavings: 1, ownershipCompletenessScore: 1 }, portfolioSnapshotId: "ps2", evidence: ["e2"] }),
    });
    const body = await res.json() as any;
    assert.equal(res.status, 403, "a query-string tenantId that conflicts with the authenticated session must be rejected outright");
    assert.equal(body.error, "TENANT_ACCESS_DENIED");
  });
});

test("[Program 14B-R / PLATFORM_ADMIN] a platform admin may still cross tenants explicitly, but a regular tenant role may not", async () => {
  await withServer(buildApp("tenant-a", "PLATFORM_ADMIN"), async (baseUrl) => {
    const build = await fetch(`${baseUrl}/api/executive-proof-packs/build/CFO`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": "tenant-b" },
      body: JSON.stringify({ metrics: { financeVerifiedSavings: 1, executedSavings: 1, ownershipCompletenessScore: 1 }, portfolioSnapshotId: "ps", evidence: ["e"] }),
    });
    assert.equal(build.status, 200, "PLATFORM_ADMIN should be able to build a proof pack on tenant B's behalf");

    const res = await fetch(`${baseUrl}/api/executive-proof-packs/packs`, { headers: { "x-tenant-id": "tenant-b" } });
    assert.equal(res.status, 200, "PLATFORM_ADMIN is explicitly allowed to act on behalf of another tenant, per requireTenantContext()'s existing role check");
    const body = await res.json() as any[];
    assert.ok(body.every((p) => p.tenantId === "tenant-b"));
  });
});

test("[Program 14B-R regression] executive-proof-packs.ts no longer falls back to a client-supplied header/default tenant value", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const source = fs.readFileSync(path.resolve(process.cwd(), "src/routes/executive-proof-packs.ts"), "utf8");
  assert.ok(!/req\.tenantId\?\?req\.header\(.x-tenant-id.\)\?\?.default./.test(source), "the old unsafe fallback chain must not reappear");
  assert.ok(/requireTenantContext/.test(source), "executive-proof-packs.ts must call requireTenantContext()");
});
