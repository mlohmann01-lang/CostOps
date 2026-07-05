import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('executive value page renders metric-first proof sections', () => {
  const page = read('../pages/ExecutiveValueDashboard.tsx')
  for (const snippet of ['Executive Value', 'Identified Value', 'Blocked Value', 'Finance Confirmed Value', 'Verified Value', 'Protected Value', 'Value Drivers', 'Blocked Value / Risks', 'Verified Outcomes', 'Finance Confidence', 'Evidence Pack', 'Outcome Ledger', 'Proof Lineage', 'Audit Trail']) assert.equal(page.includes(snippet), true)
})

test('executive value page renders exactly one executive narrative block', () => {
  const page = read('../pages/ExecutiveValueDashboard.tsx')
  assert.equal((page.match(/Executive Narrative/g) ?? []).length, 1)
  assert.equal((page.match(/data-testid='executive-value-narrative'/g) ?? []).length, 1)
})

test('executive value live hook calls APIs and has no demo fallback in live catch path', () => {
  const hook = read('../hooks/useExecutiveValueData.ts')
  for (const endpoint of ['/api/executive-value/summary', '/api/executive-value/domains', '/api/executive-value/top-drivers', '/api/executive-value/blockers', '/api/executive-value/evidence-pack']) assert.equal(hook.includes(endpoint), true)
  const catchBlocks = hook.match(/catch \(err\) \{[^}]+\}/g)?.join('\n') ?? ''
  assert.equal(/demoExecutiveValue/.test(catchBlocks), false)
})

test('executive value dashboard is linked from command outcomes evidence packs onboarding runtime and sidebar', () => {
  assert.equal(read('../pages/CommandView.tsx').includes('/executive-value'), true)
  assert.equal(read('../pages/OutcomeLedgerView.tsx').includes('Executive Value Dashboard'), true)
  assert.equal(read('../pages/EvidencePacksView.tsx').includes('Executive Evidence Pack'), true)
  assert.equal(read('../pages/M365OnboardingView.tsx').includes('/executive-value'), true)
  assert.equal(read('../components/layout/Sidebar.tsx').includes('Executive Value'), true)
  assert.equal(fs.readFileSync(new URL('../../../api-server/src/routes/runtime-observability.ts', import.meta.url), 'utf8').includes('Executive Value Engine'), true)
})
