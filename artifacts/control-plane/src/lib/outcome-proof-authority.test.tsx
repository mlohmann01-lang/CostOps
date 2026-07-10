import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('Outcome Proof Console renders canonical summary stages and evidence detail', () => {
  const page = fs.readFileSync(new URL('../pages/OutcomeLedgerView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Outcome Proof Authority'), true)
  for (const label of [
    'Projected', 'Approved', 'Executed', 'Verified',
    'Finance Confirmed', 'Protected',
    'Value Leakage', 'Confidence', 'Proof State',
  ]) {
    assert.equal(page.includes(label), true, `missing column: ${label}`)
  }
  assert.equal(page.includes('Proof Timeline'), true)
  // Canonical: 'Finance Confirmed' replaces 'Retained'
  assert.equal(page.includes('Retained'), false, 'Retained should be absent — replaced by Finance Confirmed')
  // Canonical: 'Value Leakage' replaces 'Variance'
  assert.equal(page.includes('Variance'), false, 'Variance should be absent — replaced by Value Leakage')
})

test('live outcome proof hook calls proof endpoints and does not fall back to demo in live mode', () => {
  const hook = fs.readFileSync(new URL('../hooks/useOutcomeProofData.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes('/api/outcomes/proof'), true)
  assert.equal(hook.includes('/api/outcomes/proof/summary'), true)
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  assert.equal(hook.includes('return { isEmptyLive: !workspace.dataReady || live.isEmpty'), true)
})

test('OutcomeLedgerView uses canonical hook and canonical helpers', () => {
  const page = fs.readFileSync(new URL('../pages/OutcomeLedgerView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('useCanonicalOutcomeLedger'), true)
  assert.equal(page.includes('buildOutcomeProofTimeline'), true)
  assert.equal(page.includes('calculateOutcomeLeakage'), true)
  assert.equal(page.includes('DEMO_OUTCOME_RECORDS'), false, 'page should not import DEMO data directly — comes via hook')
  assert.equal(page.includes('data-testid="outcome-proof-authority"'), true)
  assert.equal(page.includes('data-testid="outcome-summary-kpis"'), true)
  assert.equal(page.includes('data-testid="outcome-leakage-strip"'), true)
  assert.equal(page.includes('data-testid="outcome-pipeline-health"'), true)
  assert.equal(page.includes('data-testid="empty-ledger"'), true)
})
