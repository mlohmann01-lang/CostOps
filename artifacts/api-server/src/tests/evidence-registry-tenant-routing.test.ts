// Regression suite (Phase 7 equivalent-defect scan, PR #127): evidence-registry.ts had
// the same cross-tenant admin routing bug as ai-capital-allocation.ts — its tenant()
// helper read req.__authContext?.tenantId (the caller's own home tenant) ahead of
// req.tenantId (the guard-validated target tenant set by requireTenantContext()). For a
// PLATFORM_ADMIN operating on a specific customer tenant, evidence would be read/written
// under the admin's own tenant instead of the tenant they were validated for.
//
// Matches the real end-to-end HTTP test pattern established in
// executive-proof-packs-tenant-spoofing.test.ts (Program 14B-R Remediation 1).

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import evidenceRegistryRouter from "../routes/evidence-registry";

// Simulates requireTenantContext() having already run: for a PLATFORM_ADMIN, req.tenantId
// is the validated *target* tenant, which may differ from the admin's own home tenant
// recorded in __authContext.
function withGuardedTenantContext(targetTenantId: string, adminHomeTenantId: string) {
  return (req: any, _res: any, next: any) => {
    req.__authContext = { userId: "admin-1", tenantId: adminHomeTenantId, role: "PLATFORM_ADMIN", platformAdminOverride: true, authenticated: true };
    req.tenantId = targetTenantId;
    next();
  };
}

function buildApp(targetTenantId: string, adminHomeTenantId: string) {
  const app = express();
  app.use(express.json());
  app.use(withGuardedTenantContext(targetTenantId, adminHomeTenantId));
  app.use("/api/evidence-registry", evidenceRegistryRouter);
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

test("a PLATFORM_ADMIN operating on a specific customer tenant registers evidence under that tenant, not the admin's own home tenant", async () => {
  const evidenceRef = `ev-tenant-routing-1-${Date.now()}`;
  await withServer(buildApp("customer-42", "platform-hq"), async (baseUrl) => {
    const create = await fetch(`${baseUrl}/api/evidence-registry/records`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ evidenceRef, evidenceType: "APPROVAL", sourceSystem: "test" }),
    });
    assert.equal(create.status, 200);
    const created = await create.json() as any;
    assert.equal(created.tenantId, "customer-42", "evidence must be registered under the guard-validated target tenant, not the admin's own home tenant");
  });
});

test("evidence registered for one tenant is invisible when listing under a different (e.g. the admin's own) tenant", async () => {
  const evidenceRef = `ev-tenant-routing-2-${Date.now()}`;
  await withServer(buildApp("customer-99", "platform-hq"), async (baseUrl) => {
    await fetch(`${baseUrl}/api/evidence-registry/records`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ evidenceRef, evidenceType: "APPROVAL", sourceSystem: "test" }),
    });
  });

  await withServer(buildApp("platform-hq", "platform-hq"), async (baseUrl) => {
    const list = await fetch(`${baseUrl}/api/evidence-registry/records`);
    const records = await list.json() as any[];
    assert.equal(records.some((r) => r.evidenceRef === evidenceRef), false, "the admin's own tenant listing must not include another tenant's evidence");
  });
});
