import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoExecutiveRiskData, normalizeExecutiveRiskPayload } from '../hooks/useExecutiveRiskData'
import { NAV_GROUPS } from '../components/layout/Sidebar'
const read = (path:string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Executive Risk Command Center header and KPIs render', () => {
  const page = read('../pages/ExecutiveRiskCommandCenter.tsx')
  for (const snippet of ['Executive Portfolio Risk & Governance Command Center','Prioritise ownership gaps, risky renewals, AI governance exposure, SaaS sprawl, and value opportunities across the technology portfolio.','Read-only executive intelligence', 'Workspace Mode', 'Sample governance dataset','Portfolio Risk Score','Critical Issues','Ownerless Spend','Renewals At Risk','AI Governance Gaps','Potential Annual Savings','Evidence Confidence']) assert.equal(page.includes(snippet), true)
  assert.equal(page.includes("data-testid='executive-risk-kpis'"), true)
})

test('Executive Risk Command Center sections render', () => {
  const page = read('../pages/ExecutiveRiskCommandCenter.tsx')
  for (const snippet of ['Top Governance Risks','Domain Breakdown','Leadership Action Queue','Exposed Spend & Value','Evidence Readiness','Executive Narrative','Assign Owners','Review AI Policy','Renegotiate Renewals','Consolidate Vendors','Generate Evidence','Executive Review']) assert.equal(page.includes(snippet), true)
})

test('Executive Risk demo payload and fallback work', () => {
  assert.ok(JSON.stringify(demoExecutiveRiskData).includes('ChatGPT'));
  const data = normalizeExecutiveRiskPayload({});
  assert.equal(data.summary.portfolioRiskScore, demoExecutiveRiskData.summary.portfolioRiskScore);
  assert.equal(data.topRisks.length, 0);
})

test('Executive Risk sidebar route works', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import ExecutiveRiskCommandCenter from './pages/ExecutiveRiskCommandCenter'"), true)
  assert.equal(app.includes('/executive-risk'), true)
  const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => `${item.label}:${item.href}`)).join(' | ')
  assert.match(labels, /Executive Risk:\/executive-risk/)
})
