import test from 'node:test'
import assert from 'node:assert/strict'
import { generateEvidencePackJson, generateEvidencePackAuditBundle } from '../lib/evidence-pack/evidence-pack-generator'

test('json and audit export preserve full pack and authority evidence', () => {
  const pack: any = { evidencePackId: 'ep-json', tenantId: 't', generatedAt: '', scope: 'TENANT', status: 'COMPLETE', summary: {}, sections: [{ sectionId: 's' }], metrics: { completeness: 100, confidence: {}, counts: {} }, evidenceRefs: [], warnings: [], blockers: [] }
  assert.equal(generateEvidencePackJson(pack).evidencePackId, 'ep-json')
  const audit = generateEvidencePackAuditBundle({ pack, evidence: pack.sections, events: [{ eventId: 'e' }], trust: { globalTrustBand: 'HIGH' }, outcomes: [{ outcomeId: 'o' }] })
  assert.equal(audit.events.length, 1)
  assert.equal(audit.evidence.length, 1)
})
