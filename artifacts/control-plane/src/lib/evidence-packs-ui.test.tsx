import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('Evidence Packs page renders summary coverage listing and exports', () => {
  const page = fs.readFileSync(new URL('../pages/EvidencePacksView.tsx', import.meta.url), 'utf8')
  for (const label of ['Evidence Packs', 'Executive Summary', 'Projected', 'Approved', 'Executed', 'Verified', 'Protected', 'Evidence Coverage', 'Generated Packs', 'Export JSON', 'Export PDF', 'Export Audit Package']) assert.equal(page.includes(label), true)
})

test('Evidence Packs hook uses live APIs and no demo fallback on live errors', () => {
  const hook = fs.readFileSync(new URL('../hooks/useEvidencePacks.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  assert.equal(hook.includes('/api/evidence-packs/generate'), true)
  assert.equal(hook.includes('/api/evidence-packs'), true)
  assert.equal(/catch\s*\([^)]*\)\s*\{[^}]*demoEvidencePacks/s.test(hook), false)
})

test('Evidence Packs are wired into sidebar routes and existing action surfaces', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  const sidebar = fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  const outcomes = fs.readFileSync(new URL('../pages/OutcomeLedgerView.tsx', import.meta.url), 'utf8')
  const execution = fs.readFileSync(new URL('../pages/ExecutionView.tsx', import.meta.url), 'utf8')
  const onboarding = fs.readFileSync(new URL('../pages/M365OnboardingView.tsx', import.meta.url), 'utf8')
  assert.equal(app.includes('/evidence-packs'), true)
  assert.equal(sidebar.includes('Evidence Packs'), true)
  assert.equal(outcomes.includes('Generate Evidence Pack'), true)
  assert.equal(execution.includes('Generate Evidence Pack'), true)
  assert.equal(onboarding.includes('Generate Tenant Evidence Pack'), true)
  assert.equal(onboarding.includes('Generate Pilot Evidence Pack'), true)
})
