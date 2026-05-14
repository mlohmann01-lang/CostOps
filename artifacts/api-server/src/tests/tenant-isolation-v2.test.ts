import test from "node:test"; import assert from "node:assert/strict";
import { buildTenantContext, tenantSafeLookup } from "../lib/security/tenant-context";

test("platform admin explicit override only", ()=>{ const rows=tenantSafeLookup([{tenantId:"b"}] as any[], buildTenantContext({tenantId:"a",role:"PLATFORM_ADMIN",platformAdminOverride:false} as any)); assert.equal(rows.length,0); });
test("cross-tenant evidence/jobs/rollback/onboarding denied by lookup", ()=>{ const rows=tenantSafeLookup([{tenantId:"x"},{tenantId:"y"}] as any[], buildTenantContext({tenantId:"x",role:"OPERATOR",platformAdminOverride:false} as any)); assert.equal(rows.length,1); });
