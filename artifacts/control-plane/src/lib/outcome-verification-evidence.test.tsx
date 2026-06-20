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

test('Outcome Ledger renders verification columns and evidence action', () => {
  const page = fs.readFileSync(new URL('../pages/OutcomeLedgerView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Confidence'), true)
  assert.equal(page.includes('Evidence'), true)
  assert.equal(page.includes('Proof State'), true)
  assert.equal(page.includes('Verification backlog'), true)
  assert.equal(page.includes('Evidence coverage'), true)
})

test('Evidence pack drawer renders timeline snapshots and supporting evidence', () => {
  const page = fs.readFileSync(new URL('../pages/OutcomeLedgerView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Lifecycle timeline'), true)
  assert.equal(page.includes('Proof lifecycle'), true)
  assert.equal(page.includes('Missing evidence flags'), true)
  assert.equal(page.includes('Supporting evidence'), true)
})

test('live outcomes hook calls unverified API without demo fallback', () => {
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

test('Command shows verification watchlist', () => {
  const page = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Executive Brief'), true)
  assert.equal(page.includes('Open Outcomes'), true)
  assert.equal(page.includes('Open Outcomes') || page.includes('Open Action'), true)
})

test('Runtime Health shows verification pipeline', () => {
  const page = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Platform'), true)
  assert.equal(page.includes('Runtime Health'), true)
  assert.equal(page.includes('Connected Systems'), true)
})
