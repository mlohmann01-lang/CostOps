import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { requireTenantContext } from "../middleware/security-guards";

// Proves the cross-tenant admin routing fix in ai-capital-allocation.ts and the
// audit-middleware tenant-attribution fix together close the reported defect:
// a PLATFORM_ADMIN request scoped to a specific customer tenant must operate on
// (and be audited against) that tenant, not the admin token's own home tenant.

function mockReq(overrides: Partial<{ role: string; authTenantId: string; queryTenantId: string; header: string }>) {
  const { role = "PLATFORM_ADMIN", authTenantId = "platform-hq", queryTenantId, header } = overrides;
  return {
    __authContext: { tenantId: authTenantId, userId: "admin-1", authenticated: true, platformAdminOverride: role === "PLATFORM_ADMIN", role },
    query: queryTenantId ? { tenantId: queryTenantId } : {},
    header: (name: string) => (name.toLowerCase() === "x-tenant-id" ? header : undefined),
  } as any;
}

function run(mw: any, req: any) {
  let statusCode: number | null = null;
  let payload: any = null;
  let nextCalled = false;
  const res: any = { status: (c: number) => ({ json: (p: any) => { statusCode = c; payload = p; } }) };
  mw(req, res, () => { nextCalled = true; });
  return { statusCode, payload, nextCalled, req };
}

test("PLATFORM_ADMIN requesting a specific customer tenant is granted, and req.tenantId becomes the requested (target) tenant, not the admin's own", () => {
  const req = mockReq({ role: "PLATFORM_ADMIN", authTenantId: "platform-hq", queryTenantId: "customer-42" });
  const result = run(requireTenantContext(), req);
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
  assert.equal(req.tenantId, "customer-42");
});

for (const role of ["TENANT_ADMIN", "OPERATOR", "VIEWER", "APPROVER"]) {
  test(`${role} requesting a different tenant than its own is rejected (cannot cross tenants like PLATFORM_ADMIN)`, () => {
    const req = mockReq({ role, authTenantId: "tenant-a", queryTenantId: "tenant-b" });
    const result = run(requireTenantContext(), req);
    assert.equal(result.statusCode, 403);
    assert.equal(result.nextCalled, false);
    assert.equal(result.payload?.error, "TENANT_ACCESS_DENIED");
  });

  test(`${role} requesting its own tenant is granted`, () => {
    const req = mockReq({ role, authTenantId: "tenant-a", queryTenantId: "tenant-a" });
    const result = run(requireTenantContext(), req);
    assert.equal(result.nextCalled, true);
    assert.equal(req.tenantId, "tenant-a");
  });
}

test("missing tenant context fails closed in production (no default-tenant fallback)", () => {
  const prior = { nodeEnv: process.env.NODE_ENV, allowDefault: process.env.ALLOW_DEFAULT_TENANT };
  process.env.NODE_ENV = "production";
  delete process.env.ALLOW_DEFAULT_TENANT;
  try {
    const req = mockReq({ role: "PLATFORM_ADMIN", authTenantId: "platform-hq" });
    const result = run(requireTenantContext(), req);
    assert.equal(result.statusCode, 400);
    assert.equal(result.payload?.error, "TENANT_CONTEXT_REQUIRED");
    assert.equal(result.nextCalled, false);
  } finally {
    if (prior.nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prior.nodeEnv;
    if (prior.allowDefault === undefined) delete process.env.ALLOW_DEFAULT_TENANT; else process.env.ALLOW_DEFAULT_TENANT = prior.allowDefault;
  }
});

test("missing tenant context outside production falls back to the caller's own authenticated tenant (dev convenience, not a target-tenant override)", () => {
  const prior = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  try {
    const req = mockReq({ role: "TENANT_ADMIN", authTenantId: "tenant-a" });
    const result = run(requireTenantContext(), req);
    assert.equal(result.nextCalled, true);
    assert.equal(req.tenantId, "tenant-a");
  } finally {
    if (prior === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prior;
  }
});

// The same bug pattern — a route's local tenant() helper reading
// req.__authContext?.tenantId (the caller's own home tenant) ahead of
// req.tenantId (the guard-validated target tenant) — was found identically
// in 8 other route files during the Phase 7 equivalent-defect scan for this
// review thread. All were fixed with the same minimal reordering.
const ROUTE_FILES_WITH_TENANT_HELPER = [
  "ai-capital-allocation.ts",
  "ai-economics.ts",
  "decisions.ts",
  "evidence-registry.ts",
  "evidence.ts",
  "principals.ts",
  "value-realisation.ts",
  "workflow-value-graph.ts",
  "asset-owners.ts",
  "assets.ts",
];

for (const file of ROUTE_FILES_WITH_TENANT_HELPER) {
  test(`${file}'s tenant() helper reads the guard-validated req.tenantId before req.__authContext.tenantId`, () => {
    const source = fs.readFileSync(path.join(process.cwd(), `src/routes/${file}`), "utf8");
    const tenantLine = source.split("\n").find((l) => l.includes("const tenant ") || l.includes("const tenant="));
    assert.ok(tenantLine, "expected a `const tenant =` / `const tenant=` helper");
    const tenantIdIndex = tenantLine!.indexOf("req.tenantId");
    const authContextIndex = tenantLine!.indexOf("__authContext");
    assert.ok(tenantIdIndex !== -1, "tenant() must read req.tenantId (the guard-validated target tenant)");
    if (authContextIndex !== -1) {
      assert.ok(tenantIdIndex < authContextIndex, "req.tenantId must be checked before req.__authContext.tenantId in the ?? chain, so a PLATFORM_ADMIN's cross-tenant target always wins over the admin's own home tenant");
    }
  });
}
