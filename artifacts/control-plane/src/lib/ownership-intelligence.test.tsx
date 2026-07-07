import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoOwnershipIntelligenceData, normalizeOwnershipIntelligencePayload } from '../hooks/useOwnershipIntelligenceData'

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')

test('Ownership & Accountability page renders executive header and KPI row', () => {
  const page = read('../pages/OwnershipIntelligence.tsx')
  for (const snippet of ['Ownership & Accountability', 'Executive Accountability', 'Responsible Owner', 'Business Owner', 'Technical Owner', 'Executive Sponsor', 'Renewal Owner', 'Governed assets', 'Assets missing owner', 'Evidence completeness']) assert.equal(page.includes(snippet), true)
})

test('Ownership & Accountability demo scenarios render', () => {
  const text = JSON.stringify(demoOwnershipIntelligenceData())
  for (const snippet of ['Microsoft 365 E5', 'Legacy CRM', 'Unapproved AI Notes App', 'Slack / Teams collaboration capability', 'Snowflake Enterprise', 'ServiceNow ITSM']) assert.equal(text.includes(snippet), true)
})

test('Ownership & Accountability renders decision model, risks, actions and evidence', () => {
  const page = read('../pages/OwnershipIntelligence.tsx')
  for (const snippet of ['Executive Accountability Decision Model', 'Ownership Gap and Accountability Risk Register', 'Ownership Evidence Pack / Proof Pack', 'VERIFIED', 'ASSIGN', 'REASSIGN', 'REVIEW', 'ESCALATE', 'BLOCKED']) assert.equal(page.includes(snippet), true)
})

test('Ownership & Accountability normalizer does not fallback to demo for missing API/live data', () => {
  const data = normalizeOwnershipIntelligencePayload({})
  assert.equal(data.summary.governedAssets, 0)
  assert.equal(data.findings.length, 0)
})

test('Ownership & Accountability reports exposed spend not savings', () => {
  assert.equal(demoOwnershipIntelligenceData().findings.some((finding) => (finding.spend ?? 0) > 0), true)
  assert.equal(JSON.stringify(demoOwnershipIntelligenceData()).includes('Potential Annual Savings'), false)
})

test('Ownership & Accountability route works', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import OwnershipIntelligence from './pages/OwnershipIntelligence'"), true)
  assert.equal(app.includes('/ownership-accountability'), true)
})
