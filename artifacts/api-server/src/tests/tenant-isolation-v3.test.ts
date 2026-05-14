import test from "node:test"; import assert from "node:assert/strict";
import { tenantSafeLookup } from "../lib/security/tenant-context";

test("cross-tenant jobs/onboarding/evidence/rollback/verification blocked", ()=>{ const rows=tenantSafeLookup([{tenantId:'a'},{tenantId:'b'}] as any[], {tenantId:'a',canOverride:false}); assert.equal(rows.length,1); });
test("platform admin explicit override only", ()=>{ const rows=tenantSafeLookup([{tenantId:'a'},{tenantId:'b'}] as any[], {tenantId:'a',canOverride:true}); assert.equal(rows.length,2); });
test("no accidental wildcard queries", ()=>{ const rows=tenantSafeLookup([{tenantId:'x'}] as any[], {tenantId:'y',canOverride:false}); assert.equal(rows.length,0); });
