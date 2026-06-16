import test from 'node:test'; import assert from 'node:assert/strict'; import { runLiveTenantReadinessAudit } from '../lib/live-tenant-readiness';
test('LIVE_TENANT_READINESS_READY audit returns PASS',async()=>{const out=await runLiveTenantReadinessAudit(); assert.equal(out.auditId,'LIVE_TENANT_READINESS_READY'); assert.equal(out.status,'PASS');});
