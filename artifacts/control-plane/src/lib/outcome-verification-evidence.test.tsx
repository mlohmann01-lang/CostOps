import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoOutcomes } from '../data/demo'
import { normalizeOutcomes } from './liveNormalizers'

test('demo outcomes include verification packs and confidence bands', () => {
  const m365 = demoOutcomes.ledger.find((item: any) => item.action.includes('M365')) as any
  assert.equal(m365.confidence, 'HIGH')
  assert.equal(m365.evidencePack.beforeState.assignedLicenses, 47)
  assert.equal(m365.evidencePack.afterState.monthlyCost, 2450)
  assert.equal(m365.evidencePack.evidenceSources.includes('Graph assignment snapshot'), true)
})

test('Outcome Ledger renders canonical columns and proof timeline action', () => {
  // OutcomeLedgerView now uses the canonical OutcomeRecord schema.
  // Columns: Projected / Approved / Executed / Verified / Finance Confirmed / Protected /
  // Value Leakage / Confidence / Proof State. Each row expands to show the proof timeline.
  const page = fs.readFileSync(new URL('../pages/OutcomeLedgerView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Confidence'), true)
  assert.equal(page.includes('Proof State'), true)
  assert.equal(page.includes('Finance Confirmed'), true, 'Finance Confirmed replaces Retained')
  assert.equal(page.includes('Value Leakage'), true, 'Value Leakage replaces Variance')
  assert.equal(page.includes('data-testid="outcome-proof-authority"'), true)
  assert.equal(page.includes('useCanonicalOutcomeLedger'), true)
})

test('Proof timeline drawer uses buildOutcomeProofTimeline and shows chronological events', () => {
  // The old evidence pack drawer (Lifecycle timeline / Evidence coverage / Supporting evidence)
  // has been replaced by the canonical buildOutcomeProofTimeline helper and a Proof Timeline
  // section that renders events chronologically.
  const page = fs.readFileSync(new URL('../pages/OutcomeLedgerView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Proof Timeline'), true)
  assert.equal(page.includes('buildOutcomeProofTimeline'), true)
  assert.equal(page.includes('outcome-timeline-'), true, 'per-row timeline testId prefix present')
})

test('live outcomes hook calls unverified API without demo fallback', () => {
  // useOutcomesData.ts is now a thin delegate to useOutcomeProofData.ts which holds the
  // live/demo branching and fetches '/api/outcomes/proof' (the renamed unverified-outcomes API).
  const hook = fs.readFileSync(new URL('../hooks/useOutcomeProofData.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes('/api/outcomes/proof'), true)
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
})

test('normalizer preserves verification pack metadata', () => {
  const out = normalizeOutcomes([[{ id: 1, action: 'Copilot Reclaim', projectedMonthlySavings: 3800, verifiedMonthlySavings: 3620, savingsVariance: -180, verificationConfidence: 'HIGH', verificationStatus: 'VERIFIED', evidencePack: { beforeState: { assigned: 10 }, afterState: { assigned: 5 } }, verificationAge: { label: '1h old' } }], {}, { count: 0 }])
  assert.equal(out.ledger[0].confidence, 'HIGH')
  assert.equal(out.ledger[0].evidence, 'Available')
  assert.equal(out.ledger[0].verificationAge, '1h old')
})

// NOTE (Sprint 14 test cleanup): CommandView and RuntimeHealthView were each rewritten in later
// sprints (executive-brief redesign / platform-tabs redesign) and no longer render the
// 'Verification Watchlist' / 'Verification Pipeline' widgets these tests originally covered.
// The underlying verification-backlog data (pendingVerification/failedVerification,
// outcomeProof.verificationBacklog) is still computed in lib/liveNormalizers.ts and
// lib/outcomeLedgerData.ts, so this is a UI-surfacing gap rather than missing data - flagged
// here for product follow-up rather than restored speculatively under test-cleanup scope.
test('Command verification metrics remain available in the data layer', () => {
  const normalizers = fs.readFileSync(new URL('../lib/liveNormalizers.ts', import.meta.url), 'utf8')
  assert.equal(normalizers.includes('pendingVerification'), true)
  assert.equal(normalizers.includes('failedVerification'), true)
})

test('Runtime Health page renders without the legacy verification-pipeline widget', () => {
  const page = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Platform'), true)
  assert.equal(page.includes('Runtime Health'), true)
  assert.equal(page.includes('Connected Systems'), true)
  assert.equal(page.includes('runtime-component-grid'), true)
})
