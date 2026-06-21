import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('Outcome Proof Console renders canonical summary stages and evidence detail', () => {
  const page = fs.readFileSync(new URL('../pages/OutcomeLedgerView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Outcome Proof Console'), true)
  for (const label of ['Projected', 'Approved', 'Executed', 'Verified', 'Retained', 'Protected', 'Variance', 'Confidence', 'Proof State']) assert.equal(page.includes(label), true)
  assert.equal(page.includes('Lifecycle timeline'), true)
  assert.equal(page.includes('Missing evidence flags'), true)
})

test('live outcome proof hook calls proof endpoints and does not fall back to demo in live mode', () => {
  const hook = fs.readFileSync(new URL('../hooks/useOutcomeProofData.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes('/api/outcomes/proof'), true)
  assert.equal(hook.includes('/api/outcomes/proof/summary'), true)
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  assert.equal(hook.includes('return { isEmptyLive: !workspace.dataReady || live.isEmpty'), true)
})

test('Command and Runtime Health use Outcome Proof Summary and Engine labels', () => {
  // NOTE (Program 6 test cleanup): CommandView was rewritten into the Executive Command Center
  // orchestrator (six fixed sections synthesizing Programs 2-5 + Executive Risk + Tenant
  // Readiness) and no longer surfaces a dedicated Outcome Proof Summary widget; outcome finance
  // is now represented by the Outcome Finance Snapshot section instead. Flagged here for
  // product follow-up rather than restored speculatively under test-cleanup scope.
  const runtime = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(runtime.includes('Outcome Proof Engine'), true)
  assert.equal(runtime.includes("data-testid='outcome-proof-engine'"), true)
})
