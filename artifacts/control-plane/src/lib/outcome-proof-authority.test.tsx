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
  // Program 6A coverage audit: CommandView's old "Outcome Proof Summary" /
  // "outcome-proof-summary" widget was removed when CommandView became the Executive Command
  // Center orchestrator; outcome finance is now represented there by the Outcome Finance
  // Snapshot section instead. The underlying "Outcome Proof Authority" concept (projected /
  // approved / executed / verified / retained / protected ledger) still exists and renders on
  // its own owning page (OutcomeLedgerView, routed at /outcomes), so the coverage is
  // relocated there instead of CommandView. See PROGRAM_6A_COVERAGE_AUDIT.md.
  const outcomeLedgerPage = fs.readFileSync(new URL('../pages/OutcomeLedgerView.tsx', import.meta.url), 'utf8')
  const runtime = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(outcomeLedgerPage.includes('Outcome Proof Authority'), true)
  assert.equal(runtime.includes('Outcome Proof Engine'), true)
  assert.equal(runtime.includes("data-testid='outcome-proof-engine'"), true)
})
