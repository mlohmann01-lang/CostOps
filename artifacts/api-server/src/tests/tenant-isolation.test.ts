import test from "node:test"; import assert from "node:assert/strict";
import { assertTenantBoundary, sanitizeTenantResponse, validateTenantScopedQuery } from "../lib/security/tenant-isolation";

test("cross-tenant read denied", ()=>{ assert.throws(()=>assertTenantBoundary({tenantId:"t1",role:"OPERATOR",platformAdminOverride:false,userId:"u"} as any,"t2")); });
test("cross-tenant execution denied", ()=>{ assert.throws(()=>assertTenantBoundary({tenantId:"t1",role:"OPERATOR",platformAdminOverride:false,userId:"u"} as any,"t3")); });
test("cross-tenant rollback denied", ()=>{ assert.throws(()=>assertTenantBoundary({tenantId:"t1",role:"OPERATOR",platformAdminOverride:false,userId:"u"} as any,"t4")); });
test("tenant scoped evidence only", ()=>{ const rows=sanitizeTenantResponse([{tenantId:"t1"},{tenantId:"t2"}] as any[],"t1"); assert.equal(rows.length,1); assert.equal(validateTenantScopedQuery("t1"),"t1"); });
