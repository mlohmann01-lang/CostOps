import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoGovernanceGraphData, normalizeGovernanceGraphPayload } from '../hooks/useGovernanceGraphData'
import { NAV_GROUPS } from '../components/layout/Sidebar'
const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Governance Graph page renders header and KPI row', () => {
  const page = read('../pages/GovernanceGraph.tsx')
  for (const snippet of ['Technology Governance Graph', 'Connect vendors, applications, owners, renewals, findings, risks, opportunities, and evidence across the technology portfolio.', 'Read-only relationship intelligence', 'Vendors', 'Applications', 'Findings', 'Ownerless Applications', 'High-Risk Applications', 'Annual Cost Mapped', 'Potential Savings Mapped', 'Domains Represented']) assert.equal(page.includes(snippet), true)
  assert.equal(page.includes("data-testid='governance-graph-kpis'"), true)
})

test('Governance Graph renders relationship sections', () => {
  const page = read('../pages/GovernanceGraph.tsx')
  for (const snippet of ['Relationship Overview', 'Critical Relationship Insights', 'Application Relationship Table', 'Multi-Domain Risk Clusters', 'Ownerless / Blocked Governance', 'Evidence Linkage']) assert.equal(page.includes(snippet), true)
})

test('Governance Graph demo data contains connected apps and insights', () => {
  const text = JSON.stringify(demoGovernanceGraphData)
  for (const snippet of ['ChatGPT', 'Dropbox', 'Slack', 'Tableau', 'Claude', 'OWNERLESS_HIGH_SPEND', 'MULTI_DOMAIN_RISK', 'DUPLICATE_CAPABILITY_CLUSTER']) assert.equal(text.includes(snippet), true)
})

test('Governance Graph survives missing API/live data', () => {
  const data = normalizeGovernanceGraphPayload({})
  assert.equal(data.summary.applications, demoGovernanceGraphData.summary.applications)
  assert.equal(data.nodes.length, 0)
})

test('Governance Graph sidebar route works', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import GovernanceGraph from './pages/GovernanceGraph'"), true)
  assert.equal(app.includes('/governance-graph'), true)
  const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => `${item.label}:${item.href}`)).join(' | ')
  assert.match(labels, /Governance Graph:\/governance-graph/)
})
