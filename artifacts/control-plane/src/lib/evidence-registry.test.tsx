import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { demoEvidenceRegistryState } from '../hooks/useEvidenceRegistry'
import { renderEvidenceRegistryState } from '../pages/EvidenceRegistry'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Evidence Trust Center title subtitle demo and live empty states render', () => {
  const demo = renderEvidenceRegistryState({ ...demoEvidenceRegistryState(), isDemo: true })
  assert.equal(demo.title, 'Evidence Trust Center')
  assert.equal(demo.subtitle, 'Chain of custody, integrity, provenance and audit readiness for every Certen claim.')
  assert.equal(demo.demoBanner, 'Demo Mode Synthetic sample data. No production systems connected.')
  const live = renderEvidenceRegistryState({ isDemo: false, unavailable: true, snapshot: null, records: [] })
  assert.equal(live.liveEmpty, true)
  assert.equal(live.emptyTitle, 'No Evidence Yet')
  assert.equal(live.records, 0)
  assert.deepEqual(live.coverageRows, [])
  assert.equal(live.trustScore, 'Not available')
})

test('trust hero chain coverage gaps timeline audit readiness and evidence assets are present', () => {
  const page = read('../pages/EvidenceRegistry.tsx')
  for (const snippet of ['Trust Score', 'Audit Readiness', 'Evidence Coverage', 'Integrity Health', 'Trust Chain', 'Collected', 'Validated', 'Linked', 'Retained', 'Redacted', 'Exported', 'Evidence Coverage by Domain', 'Microsoft 365', 'AI Platforms', 'SaaS', 'Cloud', 'ServiceNow', 'Finance', 'Evidence Gaps', 'Blocked stage', 'Required evidence', 'Recommended action', 'Proof Timeline', 'Protected Evidence', 'Expiry Risk', 'Export Readiness', 'Evidence Assets']) assert.equal(page.includes(snippet), true)
})

test('demo evidence derives trust, coverage, gaps, timeline and audit checklist from existing data', () => {
  const rendered = renderEvidenceRegistryState({ ...demoEvidenceRegistryState(), isDemo: true })
  assert.equal(rendered.trustScore, '90%')
  assert.equal(rendered.auditReadiness, 'DEMO')
  assert.equal(rendered.coverageRows.some((row: any) => row.domain === 'Microsoft 365' && row.validated === 1), true)
  assert.equal(rendered.gaps.length, 1)
  assert.equal(rendered.timelineEvents > 0, true)
  assert.deepEqual(rendered.auditChecklist, ['Retention', 'Redaction', 'Protected Evidence', 'Expiry Risk', 'Export Readiness'])
})
