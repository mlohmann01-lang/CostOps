import test from 'node:test'; import assert from 'node:assert/strict'; import { FINANCIAL_TRUTH_LAYER_READY, runFinancialTruthAuthorityAudit } from '../lib/financial-truth-authority';
test('financial truth authority audit returns PASS',async()=>{const r=await runFinancialTruthAuthorityAudit(); assert.equal(r.auditId,FINANCIAL_TRUTH_LAYER_READY); assert.equal(r.status,'PASS');});
