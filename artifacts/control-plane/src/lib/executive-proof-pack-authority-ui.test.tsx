import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  demoExecutiveProofPackAuthoritySummary,
  demoPacks,
  executiveProofPackAuthorityApiPaths,
  useExecutiveProofPackAuthorityData,
} from '../hooks/useExecutiveProofPackAuthorityData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

function read(relPath: string) { return fs.readFileSync(new URL(relPath, import.meta.url), 'utf8') }

test('1. Route exists', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import ExecutiveProofPackAuthorityView from './pages/ExecutiveProofPackAuthorityView'"), true)
  assert.equal(app.includes('path="/executive-proof-pack-authority"'), true)
})

test('2. Navigation entry exists', () => {
  const executive = NAV_GROUPS.find((g) => g.label === 'Executive')!
  const allGroups = NAV_GROUPS.flatMap((g) => g.items)
  const hasEntry = allGroups.some((i) => i.href === '/executive-proof-pack-authority')
  assert.ok(hasEntry, 'Navigation must have Proof Pack Authority link at /executive-proof-pack-authority')
})

test('3. Summary cards render', () => {
  const page = read('../pages/ExecutiveProofPackAuthorityView.tsx')
  for (const label of ['Ready Packs', 'Incomplete Packs', 'Exported Packs', 'Verified Annual Value', 'Protected Annual Value', 'Certified Wedges']) {
    assert.equal(page.includes(label), true, `Missing summary card: ${label}`)
  }
})

test('4. Pack readiness matrix renders all six pack types', () => {
  const page = read('../pages/ExecutiveProofPackAuthorityView.tsx')
  assert.equal(page.includes('Pack Readiness Matrix'), true)
  for (const label of ['Board Pack', 'CFO Pack', 'CIO Pack', 'Procurement Pack', 'Audit Pack', 'Operator Pack']) {
    assert.equal(page.includes(label), true, `Missing pack type: ${label}`)
  }
  for (const col of ['Status', 'Completeness', 'Audience', 'Generated At', 'Missing Items']) {
    assert.equal(page.includes(col), true, `Missing matrix column: ${col}`)
  }
})

test('5. Value bridge renders', () => {
  const page = read('../pages/ExecutiveProofPackAuthorityView.tsx')
  assert.equal(page.includes('Value Bridge'), true)
  for (const stage of ['Projected', 'Approved', 'Executed', 'Verified', 'Protected', 'Drifted', 'Retained']) {
    assert.equal(page.includes(stage), true, `Missing value bridge stage: ${stage}`)
  }
})

test('6. Detail drawer renders', () => {
  const page = read('../pages/ExecutiveProofPackAuthorityView.tsx')
  assert.equal(page.includes('PackDetail'), true)
  assert.equal(page.includes('selectedPack'), true)
  for (const field of ['Pack Summary', 'Sections', 'Evidence IDs', 'Actions', 'Outcomes', 'Protected Outcomes', 'Wedges', 'Completeness', 'Export Readiness']) {
    assert.equal(page.includes(field), true, `Missing drawer field: ${field}`)
  }
  assert.equal(page.includes('onClose'), true)
})

test('7. Section viewer renders', () => {
  const page = read('../pages/ExecutiveProofPackAuthorityView.tsx')
  assert.equal(page.includes('SectionViewer'), true)
  for (const field of ['Title', 'Narrative', 'Metrics', 'Evidence Count', 'Source Refs']) {
    assert.equal(page.includes(field), true, `Missing section viewer field: ${field}`)
  }
})

test('8. Deterministic narrative renders', () => {
  const page = read('../pages/ExecutiveProofPackAuthorityView.tsx')
  assert.equal(page.includes('Deterministic Narrative'), true)
  assert.equal(page.includes('buildNarrative'), true)
  assert.equal(page.includes('Five proof packs are ready for executive use.'), true)
  assert.equal(page.includes('of annualized value has been verified'), true)
  assert.equal(page.includes('is currently protected'), true)
  // deterministic — no AI generation
  const hook = read('../hooks/useExecutiveProofPackAuthorityData.ts')
  assert.equal(hook.includes('openai') || hook.includes('anthropic'), false)
})

test('9. Generate buttons render', () => {
  const page = read('../pages/ExecutiveProofPackAuthorityView.tsx')
  for (const label of ['Generate Board Pack', 'Generate CFO Pack', 'Generate CIO Pack', 'Generate Procurement Pack', 'Generate Audit Pack', 'Generate Operator Pack']) {
    assert.equal(page.includes(label), true, `Missing generate button: ${label}`)
  }
})

test('10. Demo mode disables generate/export/archive actions', () => {
  const page = read('../pages/ExecutiveProofPackAuthorityView.tsx')
  assert.equal(page.includes('disabled={isDemo}'), true, 'Buttons must be disabled in demo mode')
  assert.equal(page.includes('Buttons disabled in demo mode'), true, 'Must show demo mode message for buttons')
  assert.equal(page.includes('Demo only'), true, 'Must label demo-mode actions as Demo only')
})

test('11. Cross-links render', () => {
  const page = read('../pages/ExecutiveProofPackAuthorityView.tsx')
  for (const label of ['Open Certified Wedges', 'Open Technology Portfolio Authority', 'Open Executive Value', 'Open Evidence Packs', 'Open Outcome Protection', 'Open Action Center']) {
    assert.equal(page.includes(label), true, `Missing cross-link: ${label}`)
  }
})

test('12. Demo fallback works', () => {
  const page = read('../pages/ExecutiveProofPackAuthorityView.tsx')
  const hook = read('../hooks/useExecutiveProofPackAuthorityData.ts')
  assert.equal(typeof useExecutiveProofPackAuthorityData, 'function')
  assert.deepEqual([...executiveProofPackAuthorityApiPaths], ['/api/executive-proof-packs/summary', '/api/executive-proof-packs'])
  assert.equal(page.includes('Demo fallback data'), true)
  assert.equal(page.includes('Proof Pack APIs unavailable. Showing demo fallback data.'), true)
  assert.equal(hook.includes('demoPacks'), true)
  assert.equal(hook.includes('isDemo'), true)
  assert.equal(demoPacks.length, 6, 'Demo must have all 6 pack types')
  const types = demoPacks.map((p) => p.packType)
  for (const t of ['BOARD_PACK', 'CFO_PACK', 'CIO_PACK', 'PROCUREMENT_PACK', 'AUDIT_PACK', 'OPERATOR_PACK']) {
    assert.ok(types.includes(t as any), `Missing demo pack: ${t}`)
  }
  assert.equal(demoExecutiveProofPackAuthoritySummary.boardPackReady, true)
  assert.equal(demoExecutiveProofPackAuthoritySummary.cfoPackReady, true)
  assert.equal(demoExecutiveProofPackAuthoritySummary.cioPackReady, true)
  assert.equal(demoExecutiveProofPackAuthoritySummary.procurementPackReady, false)
  assert.equal(demoExecutiveProofPackAuthoritySummary.auditPackReady, true)
  assert.ok(demoExecutiveProofPackAuthoritySummary.verifiedAnnualValue > 0)
  assert.ok(demoExecutiveProofPackAuthoritySummary.protectedAnnualValue > 0)
})

test('13. No LeftShield labels', () => {
  const combined = read('../pages/ExecutiveProofPackAuthorityView.tsx') + read('../hooks/useExecutiveProofPackAuthorityData.ts')
  assert.equal(combined.includes('LeftShield'), false)
})

test('14. No Agent Security Analytics labels', () => {
  const combined = read('../pages/ExecutiveProofPackAuthorityView.tsx') + read('../hooks/useExecutiveProofPackAuthorityData.ts')
  assert.equal(combined.includes('Agent Security Analytics'), false)
})
