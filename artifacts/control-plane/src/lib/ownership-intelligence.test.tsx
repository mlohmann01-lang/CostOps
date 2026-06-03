import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoOwnershipIntelligenceData, normalizeOwnershipIntelligencePayload } from '../hooks/useOwnershipIntelligenceData'
import { NAV_GROUPS } from '../components/layout/Sidebar'
const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Ownership Intelligence page renders header and KPI row', () => {
  const page = read('../pages/OwnershipIntelligence.tsx')
  for (const snippet of ['Vendor & Application Ownership Intelligence', 'Identify applications, vendors, renewals, AI tools, and high-spend services without clear accountability.', 'Read-only intelligence', 'Workspace Mode', 'Sample governance dataset', 'Applications Reviewed', 'Ownerless Applications', 'Annual Spend Without Owner', 'Renewals Without Owner', 'AI Apps Without Owner', 'High-Risk Ownership Findings']) assert.equal(page.includes(snippet), true)
  assert.equal(page.includes("data-testid='ownership-kpis'"), true)
})

test('Ownership Intelligence demo vendors render', () => {
  const text = JSON.stringify(demoOwnershipIntelligenceData)
  for (const vendor of ['Slack', 'Zoom', 'Tableau', 'Dropbox', 'ChatGPT', 'Claude', 'Box', 'Miro', 'Salesforce', 'HubSpot']) assert.equal(text.includes(vendor), true)
})

test('Ownership Intelligence renders map findings accountability sections actions and evidence', () => {
  const page = read('../pages/OwnershipIntelligence.tsx')
  for (const snippet of ['Ownership Accountability Map', 'Owned', 'Partially Owned', 'Ownerless', 'Stale', 'Conflicted', 'Ownership Findings Table', 'Spend Without Accountability', 'Renewals Without Owner', 'AI Applications Without Owner', 'Owner Conflicts / Stale Ownership', 'Recommended Actions', 'Assign business owner', 'Assign technical owner', 'Assign budget owner', 'Assign renewal owner', 'Confirm stale owner', 'Resolve owner conflict', 'Escalate high-spend ownerless app', 'Evidence Panel']) assert.equal(page.includes(snippet), true)
})

test('Ownership Intelligence survives missing API/live data', () => {
  const data = normalizeOwnershipIntelligencePayload({})
  assert.equal(data.summary.applicationsReviewed, demoOwnershipIntelligenceData.summary.applicationsReviewed)
  assert.equal(data.findings.length, 0)
})

test('Ownership Intelligence reports exposed spend not savings', () => {
  assert.equal(demoOwnershipIntelligenceData.summary.annualSpendWithoutOwner > 0, true)
  assert.equal(JSON.stringify(demoOwnershipIntelligenceData).includes('Potential Annual Savings'), false)
})

test('Ownership Intelligence sidebar route works', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import OwnershipIntelligence from './pages/OwnershipIntelligence'"), true)
  assert.equal(app.includes('/ownership'), true)
  const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => `${item.label}:${item.href}`)).join(' | ')
  assert.match(labels, /Technology Portfolio:\/technology-portfolio/)
})
