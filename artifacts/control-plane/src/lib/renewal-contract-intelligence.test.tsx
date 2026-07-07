import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoRenewalContractData, normalizeRenewalContractPayload } from '../hooks/useRenewalContractData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Renewal Contract Intelligence page renders header and KPI row', () => {
  const page = read('../pages/RenewalContractIntelligence.tsx')
  for (const snippet of ['Technology Management — Renewal Risk', 'Which contracts and renewals require RENEW, OPTIMISE, CONSOLIDATE, RETIRE, REVIEW or BLOCKED management decisions?', 'Read-only intelligence', 'Upcoming Renewals', 'Annual Spend Reviewed', 'Potential Annual Savings', 'High-Risk Renewals', 'Contracts Missing Owner', 'Negotiation Opportunities']) assert.equal(page.includes(snippet), true)
  assert.equal(page.includes("data-testid='renewal-contract-kpis'"), true)
})

test('Renewal Contract Intelligence demo vendors render', () => {
  const text = JSON.stringify(demoRenewalContractData)
  for (const vendor of ['Slack', 'Zoom', 'Tableau', 'Dropbox', 'Figma', 'HubSpot', 'Miro', 'Claude', 'Box']) assert.equal(text.includes(vendor), true)
})

test('Renewal Contract Intelligence renders calendar windows table sections actions and evidence', () => {
  const page = read('../pages/RenewalContractIntelligence.tsx')
  for (const snippet of ['Renewal Calendar', '0–30 days', '31–60 days', '61–90 days', '91–120 days', '121–180 days', 'Renewal Risk Table', 'Negotiation Opportunities', 'Consolidation Before Renewal', 'Owner / Data Gaps', 'Recommended Actions', 'Renegotiate before renewal', 'Reduce seats before renewal', 'Consolidate duplicate vendors', 'Retire low-use tools', 'Assign contract owner', 'Validate missing usage/cost data', 'Prepare executive renewal review', 'Evidence Panel']) assert.equal(page.includes(snippet), true)
  for (const bucket of ['31–60 days', '61–90 days', '91–120 days', '121–180 days']) assert.equal(demoRenewalContractData.renewalCalendar.some((window) => window.label === bucket), true)
})

test('Renewal Contract Intelligence survives missing API/live data', () => {
  const data = normalizeRenewalContractPayload({})
  assert.equal(data.summary.upcomingRenewals, 0)
  assert.equal(data.findings.length, 0)
  assert.equal(data.renewalCalendar.length, 0)
})

test('Renewal Contract Intelligence does not fabricate savings for owner or data gaps', () => {
  assert.equal(demoRenewalContractData.findings.filter((finding) => ['OWNER_GAP', 'MISSING_USAGE_DATA', 'MISSING_COST_DATA'].includes(finding.findingType)).every((finding) => finding.potentialAnnualSavings === undefined), true)
  assert.equal(demoRenewalContractData.findings.some((finding) => Number(finding.potentialAnnualSavings) > 0), true)
})

test('Renewal Contract Intelligence sidebar route works', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import RenewalContractIntelligence from './pages/RenewalContractIntelligence'"), true)
  assert.equal(app.includes('/renewals'), true)
  const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => `${item.label}:${item.href}`)).join(' | ')
  assert.match(labels, /Technology Portfolio:\/technology-portfolio/)
})
