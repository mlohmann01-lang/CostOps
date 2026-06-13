import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { certifiedWedgeRegistryApiPaths, demoCertifiedWedgeRegistry, useCertifiedWedgeRegistryData } from '../hooks/useCertifiedWedgeRegistryData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

function read(relPath: string) { return fs.readFileSync(new URL(relPath, import.meta.url), 'utf8') }

test('Route exists and navigation entry exists under Admin', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import CertifiedWedgeRegistryView from './pages/CertifiedWedgeRegistryView'"), true)
  assert.equal(app.includes('path="/certified-wedges"'), true)
  const admin = NAV_GROUPS.find((group) => group.label === 'Admin')!
  assert.ok(admin, 'Admin nav group must exist')
  assert.ok(admin.items.some((item) => item.label === 'Certified Wedges'), 'Admin must have Certified Wedges nav item')
  assert.ok(admin.items.some((item) => item.href === '/certified-wedges'), 'Certified Wedges must link to /certified-wedges')
})

test('Data hook consumes registry APIs and exposes demo fallback', () => {
  assert.equal(typeof useCertifiedWedgeRegistryData, 'function')
  assert.deepEqual([...certifiedWedgeRegistryApiPaths], ['/api/certification/wedges/summary', '/api/certification/wedges'])
  assert.equal(demoCertifiedWedgeRegistry.totalWedges, 7)
  assert.equal(demoCertifiedWedgeRegistry.wedges.length, 7)
  assert.ok(demoCertifiedWedgeRegistry.certifiedWedges > 0)
  assert.ok(demoCertifiedWedgeRegistry.certifiedPlaybooks > 0)
  assert.ok(demoCertifiedWedgeRegistry.controlledExecutionWedges > 0)
  assert.equal(demoCertifiedWedgeRegistry.realProviderExecutionWedges, 0)
  assert.equal(demoCertifiedWedgeRegistry.simulatedOnlyWedges, 0)
  assert.ok(Array.isArray(demoCertifiedWedgeRegistry.blockers))
  assert.ok(demoCertifiedWedgeRegistry.blockers.length > 0)
})

test('Summary cards render', () => {
  const page = read('../pages/CertifiedWedgeRegistryView.tsx')
  for (const text of ['Certified Wedges', 'Certified Playbooks', 'Controlled Execution Wedges', 'Production Ready Wedges', 'Blockers']) {
    assert.equal(page.includes(text), true, `Missing metric card: ${text}`)
  }
})

test('Wedge table renders all seven wedges', () => {
  const hook = read('../hooks/useCertifiedWedgeRegistryData.ts')
  for (const id of ['m365', 'ai', 'servicenow', 'data-platform', 'aws', 'azure', 'itam']) {
    assert.equal(hook.includes(id), true, `Missing wedge in demo data: ${id}`)
  }
  const page = read('../pages/CertifiedWedgeRegistryView.tsx')
  assert.equal(page.includes('Wedge Certification Table'), true)
  assert.equal(page.includes('summary.wedges.map'), true)
  for (const col of ['Wedge', 'Domain', 'Status', 'Execution Class', 'Certified Playbooks', 'Lifecycle Coverage', 'Live Tenant Ready', 'Production Ready', 'Blockers']) {
    assert.equal(page.includes(col), true, `Missing column: ${col}`)
  }
})

test('Lifecycle coverage renders all ten stages', () => {
  const page = read('../pages/CertifiedWedgeRegistryView.tsx')
  for (const stage of ['Discovery', 'Trust', 'Approval', 'Execution', 'Rollback', 'Verification', 'Outcome', 'Protection', 'Drift', 'Executive Proof']) {
    assert.equal(page.includes(stage), true, `Missing lifecycle stage: ${stage}`)
  }
})

test('Detail drawer renders', () => {
  const page = read('../pages/CertifiedWedgeRegistryView.tsx')
  assert.equal(page.includes('WedgeDetail'), true)
  assert.equal(page.includes('expandedWedge'), true)
  assert.equal(page.includes('Certification Source'), true)
  assert.equal(page.includes('Last Certified At'), true)
  assert.equal(page.includes('onClose'), true)
})

test('Playbook table renders', () => {
  const page = read('../pages/CertifiedWedgeRegistryView.tsx')
  assert.equal(page.includes('Playbooks'), true)
  assert.equal(page.includes('entry.playbooks.map'), true)
  assert.equal(page.includes('playbookId'), true)
})

test('Deterministic narrative renders', () => {
  const page = read('../pages/CertifiedWedgeRegistryView.tsx')
  assert.equal(page.includes('Deterministic Narrative'), true)
  assert.equal(page.includes('buildNarrative'), true)
  assert.equal(page.includes('Certen currently has'), true)
  assert.equal(page.includes('certified wedge'), true)
  assert.equal(page.includes('certified playbook'), true)
  assert.equal(page.includes('No simulated-only wedge is marked certified'), true)
  // narrative is deterministic, not AI-generated
  const hook = read('../hooks/useCertifiedWedgeRegistryData.ts')
  assert.equal(hook.includes('openai') || hook.includes('anthropic'), false)
})

test('Cross-links render', () => {
  const page = read('../pages/CertifiedWedgeRegistryView.tsx')
  for (const label of ['Open Live Tenant Readiness', 'Open Action Center', 'Open Executive Value', 'Open Evidence Packs', 'Open Outcome Protection']) {
    assert.equal(page.includes(label), true, `Missing cross-link: ${label}`)
  }
})

test('Demo fallback works', () => {
  const page = read('../pages/CertifiedWedgeRegistryView.tsx')
  const hook = read('../hooks/useCertifiedWedgeRegistryData.ts')
  assert.equal(page.includes('Demo fallback data'), true)
  assert.equal(page.includes('Registry APIs unavailable. Showing demo fallback data.'), true)
  assert.equal(hook.includes('demoCertifiedWedgeRegistry'), true)
  assert.equal(hook.includes('isDemo'), true)
})

test('No LeftShield labels', () => {
  const combined = [
    read('../pages/CertifiedWedgeRegistryView.tsx'),
    read('../hooks/useCertifiedWedgeRegistryData.ts'),
  ].join('\n')
  assert.equal(combined.includes('LeftShield'), false)
  assert.equal(combined.includes('Agent Security Analytics'), false)
})
