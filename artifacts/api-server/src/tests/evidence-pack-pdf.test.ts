import test from 'node:test'
import assert from 'node:assert/strict'
import { generateEvidencePackPdf } from '../lib/evidence-pack/evidence-pack-generator'

test('pdf generator returns executive evidence pack buffer', () => {
  const pdf = generateEvidencePackPdf({ evidencePackId: 'ep1', tenantId: 't', generatedAt: '', scope: 'TENANT', status: 'COMPLETE', summary: { projectedSavings: 1, approvedSavings: 2, executedSavings: 3, verifiedSavings: 4, protectedSavings: 5, trustScore: 80, connectorCoverage: 90, opportunities: 1, approvals: 1, executions: 1, verificationRate: 100, driftStatus: 'MONITORED' }, sections: [], metrics: { completeness: 50, confidence: {}, counts: {} }, evidenceRefs: [], warnings: [], blockers: [] })
  assert.ok(Buffer.isBuffer(pdf))
  assert.ok(pdf.toString('utf8').includes('Executive Evidence Pack'))
})
