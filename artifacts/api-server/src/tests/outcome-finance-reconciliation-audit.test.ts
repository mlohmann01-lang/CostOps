import test from 'node:test'; import assert from 'node:assert/strict'; import { runOutcomeFinanceReconciliationAudit } from '../lib/outcome-finance-reconciliation';
test('outcome finance reconciliation audit returns PASS',async()=>{const audit=await runOutcomeFinanceReconciliationAudit(); assert.equal(audit.code,'OUTCOME_FINANCE_RECONCILIATION_READY'); assert.equal(audit.status,'PASS');});
