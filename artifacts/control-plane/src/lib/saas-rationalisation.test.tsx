import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoSaaSRationalisationData, normalizeSaaSRationalisationPayload } from '../hooks/useSaaSRationalisationData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('SaaSRationalisation renders header and KPI row', () => {
  const page = read('../pages/SaaSRationalisation.tsx')
  for (const snippet of ['SaaS Rationalisation', 'Identify overlapping vendors, underused SaaS, owner gaps, renewal risk, and consolidation opportunities.', 'Read-only intelligence', 'Workspace Mode', 'Sample governance dataset', 'Applications Reviewed', 'Overlap Groups', 'Duplicate Capability Findings', 'Potential Annual Savings', 'Governance Findings', 'Renewal Risks']) assert.equal(page.includes(snippet), true)
  assert.equal(page.includes("data-testid='saas-rationalisation-kpis'"), true)
})

test('SaaS Rationalisation demo data renders key vendors', () => {
  const text = JSON.stringify(demoSaaSRationalisationData)
  for (const vendor of ['Microsoft Teams', 'Slack', 'Zoom', 'OneDrive', 'Dropbox', 'Box', 'Miro', 'Lucid', 'Asana', 'Monday', 'Jira', 'Figma', 'Canva', 'ChatGPT', 'Microsoft Copilot', 'Claude', 'Salesforce', 'HubSpot', 'Tableau', 'Power BI']) assert.equal(text.includes(vendor), true)
})

test('SaaSRationalisation renders overlap findings savings governance actions and evidence sections', () => {
  const page = read('../pages/SaaSRationalisation.tsx')
  for (const snippet of ['Vendor Overlap Map', 'Rationalisation Findings', 'Savings Opportunities', 'Governance Exposure', 'Recommended Actions', 'Consolidate duplicate tools', 'Retire dormant vendors', 'Assign missing owners', 'Review renewal-risk vendors', 'Validate underused high-cost apps', 'Decide preferred tool per capability category', 'Evidence Panel']) assert.equal(page.includes(snippet), true)
  const groups = demoSaaSRationalisationData.overlapGroups.map((group) => group.displayName).join(' | ')
  for (const group of ['Communication', 'Storage', 'Collaboration', 'Project Management', 'AI Productivity', 'Analytics', 'CRM']) assert.equal(groups.includes(group), true)
})

test('SaaS Rationalisation route and sidebar link are wired', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import SaaSRationalisation from './pages/SaaSRationalisation'"), true)
  assert.equal(app.includes('/saas-rationalisation'), true)
  const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => `${item.label}:${item.href}`)).join(' | ')
  assert.match(labels, /SaaS Rationalisation:\/saas-rationalisation/)
})

test('SaaS Rationalisation page survives missing API/live data', () => {
  const data = normalizeSaaSRationalisationPayload({})
  assert.equal(data.summary.applicationsReviewed, demoSaaSRationalisationData.summary.applicationsReviewed)
  assert.equal(data.findings.length, 0)
  assert.equal(data.overlapGroups.length, 0)
})

test('SaaS Rationalisation savings opportunities render only supported savings', () => {
  assert.equal(demoSaaSRationalisationData.findings.filter((finding) => finding.findingType === 'UNMANAGED_VENDOR' || finding.findingType === 'OWNER_GAP').every((finding) => finding.potentialAnnualSavings === undefined), true)
  assert.equal(demoSaaSRationalisationData.findings.some((finding) => Number(finding.potentialAnnualSavings) > 0), true)
})
