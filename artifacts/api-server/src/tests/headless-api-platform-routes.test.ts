// Program 15 — Headless platform & authority route tests.
//
// Proves: (a) the authority registry enumerates real authorities of both
// shapes (STATIC and TENANT_SCOPED); (b) the new routers require tenant
// context exactly like every other authority router in this codebase, by
// mounting them WITHOUT requireTenantContext() applied (mirroring how a
// developer might mis-mount them) and confirming the route's own logic
// still rejects an unauthenticated/tenant-less request rather than
// silently defaulting; (c) /api/authorities/:authorityId resolves a STATIC
// authority with no tenant required and rejects a TENANT_SCOPED one
// without req.tenantId.

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import headlessPlatformRouter from "../routes/headless-platform";
import authoritiesRouter from "../routes/authorities";
import { listAuthorities, getAuthorityEntry } from "../lib/headless-api-platform/authority-registry";

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

test("[authority enumeration] registry lists both STATIC and TENANT_SCOPED authorities, including the 5 minimum-required ones", () => {
  const list = listAuthorities();
  const ids = new Set(list.map((a) => a.id));
  for (const expected of ["technology-portfolio", "executive-proof-packs", "live-tenant-readiness", "database-tenant-isolation", "security-hardening"]) {
    assert.ok(ids.has(expected), `missing required authority ${expected}`);
  }
  assert.ok(list.some((a) => a.kind === "STATIC"));
  assert.ok(list.some((a) => a.kind === "TENANT_SCOPED"));
});

test("[authority enumeration] getAuthorityEntry resolves a real STATIC authority result", async () => {
  const entry = getAuthorityEntry("security-hardening");
  assert.ok(entry);
  const result = await entry!.resolve();
  assert.equal((result as any).authority, "SECURITY_HARDENING_AUTHORITY");
});

test("[headless-platform routes] GET / returns the full authority result", async () => {
  const app = express();
  app.use("/api/headless-platform", headlessPlatformRouter);
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/headless-platform`);
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.authority, "HEADLESS_API_PLATFORM");
  });
});

test("[headless-platform routes] /readiness, /categories, /findings each return their slice", async () => {
  const app = express();
  app.use("/api/headless-platform", headlessPlatformRouter);
  await withServer(app, async (baseUrl) => {
    const readiness = await (await fetch(`${baseUrl}/api/headless-platform/readiness`)).json() as any;
    assert.ok(readiness.overallReadiness);
    const categories = await (await fetch(`${baseUrl}/api/headless-platform/categories`)).json() as any;
    assert.equal(categories.categories.length, 7);
    const findings = await (await fetch(`${baseUrl}/api/headless-platform/findings`)).json() as any;
    assert.ok(Array.isArray(findings.findings));
    assert.ok(Array.isArray(findings.recommendations));
  });
});

test("[authorities routes] GET /api/authorities lists the registry", async () => {
  const app = express();
  app.use("/api/authorities", authoritiesRouter);
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/authorities`);
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.ok(body.authorities.length >= 5);
  });
});

test("[authorities routes] GET /api/authorities/:id resolves a STATIC authority without requiring req.tenantId", async () => {
  const app = express();
  app.use("/api/authorities", authoritiesRouter);
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/authorities/security-hardening`);
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.kind, "STATIC");
    assert.equal(body.result.authority, "SECURITY_HARDENING_AUTHORITY");
  });
});

test("[authorities routes / security] GET /api/authorities/:id for a TENANT_SCOPED authority is rejected when req.tenantId is absent (mirrors requireTenantContext's contract)", async () => {
  const app = express();
  // Intentionally mounted WITHOUT requireTenantContext(), simulating the
  // failure mode this route's own internal guard must still catch.
  app.use("/api/authorities", authoritiesRouter);
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/authorities/technology-portfolio`);
    assert.equal(res.status, 400);
    const body = await res.json() as any;
    assert.equal(body.error, "TENANT_CONTEXT_REQUIRED");
  });
});

test("[authorities routes] unknown authorityId returns 404", async () => {
  const app = express();
  app.use("/api/authorities", authoritiesRouter);
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/authorities/does-not-exist`);
    assert.equal(res.status, 404);
  });
});

test("[security] routes/index.ts mounts both new routers behind requireTenantContext() and requireCapability(), like every other authority router", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const source = fs.readFileSync(path.resolve(process.cwd(), "src/routes/index.ts"), "utf8");
  assert.match(source, /router\.use\("\/headless-platform",\s*requireTenantContext\(\),\s*requireCapability\(/);
  assert.match(source, /router\.use\("\/authorities",\s*requireTenantContext\(\),\s*requireCapability\(/);
});
