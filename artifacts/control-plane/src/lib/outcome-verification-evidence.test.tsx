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
  assert.equal(page.includes('Status'), true)
  assert.equal(page.includes('Verification Age'), true)
  assert.equal(page.includes('View Evidence'), true)
})

test('Evidence pack drawer renders timeline snapshots and supporting evidence', () => {
  const page = fs.readFileSync(new URL('../pages/OutcomeLedgerView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Execution Timeline'), true)
  assert.equal(page.includes('Before snapshot'), true)
  assert.equal(page.includes('After snapshot'), true)
  assert.equal(page.includes('Supporting evidence'), true)
})

test('live outcomes hook calls unverified API without demo fallback', () => {
  const hook = fs.readFileSync(new URL('../hooks/useOutcomesData.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes('/api/outcomes/unverified'), true)
  assert.equal(hook.includes("if(w.mode==='demo')"), true)
})

test('normalizer preserves verification pack metadata', () => {
  const out = normalizeOutcomes([[{ id: 1, action: 'Copilot Reclaim', projectedMonthlySavings: 3800, verifiedMonthlySavings: 3620, savingsVariance: -180, verificationConfidence: 'HIGH', verificationStatus: 'VERIFIED', evidencePack: { beforeState: { assigned: 10 }, afterState: { assigned: 5 } }, verificationAge: { label: '1h old' } }], {}, { count: 0 }])
  assert.equal(out.ledger[0].confidence, 'HIGH')
  assert.equal(out.ledger[0].evidence, 'Available')
  assert.equal(out.ledger[0].verificationAge, '1h old')
})

test('Command shows verification watchlist', () => {
  const page = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Verification Watchlist'), true)
  assert.equal(page.includes('outcomes awaiting verification'), true)
  assert.equal(page.includes('projected value pending proof'), true)
})

test('Runtime Health shows verification pipeline', () => {
  const page = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(page.includes('Verification Pipeline'), true)
  assert.equal(page.includes('verification-pipeline'), true)
  assert.equal(page.includes('verification backlog'), true)
})
