import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoExecutiveRiskData, normalizeExecutiveRiskPayload } from '../hooks/useExecutiveRiskData'
import { NAV_GROUPS } from '../components/layout/Sidebar'
const read = (path:string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Executive Risk Command Center header and KPIs render', () => {
  const page = read('../pages/ExecutiveRiskCommandCenter.tsx')
  for (const snippet of ['Executive Risk','Portfolio-level risk, exposed spend, renewal urgency and governance action priorities.','Demo Mode','Execution Disabled','Data Trust HIGH','Portfolio Risk Score','Exposed Spend','Ownerless Spend','Potential Annual Savings','Renewals at Risk','Evidence Confidence']) assert.equal(page.includes(snippet), true)
  assert.equal(page.includes("data-testid='executive-risk-kpis'"), true)
})

test('Executive Risk Command Center sections render', () => {
  const page = read('../pages/ExecutiveRiskCommandCenter.tsx')
  for (const snippet of ['Top Governance Risks','Risk by Domain','Leadership Action Queue','Evidence Readiness','Executive narrative','Assign Owners','Review AI Policy','Renegotiate Renewals','Consolidate Vendors','Retire Unused Tools','Validate Data','Generate Evidence']) assert.equal(page.includes(snippet), true)
})

test('Executive Risk demo payload and empty live payload are distinct', () => {
  assert.ok(JSON.stringify(demoExecutiveRiskData).includes('ChatGPT'));
  const data = normalizeExecutiveRiskPayload({});
  assert.equal(data.summary.portfolioRiskScore, 0);
  assert.equal(data.topRisks.length, 0);
})

test('Executive Risk sidebar route works', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import ExecutiveRiskCommandCenter from './pages/ExecutiveRiskCommandCenter'"), true)
  assert.equal(app.includes('/executive-risk'), true)
  const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => `${item.label}:${item.href}`)).join(' | ')
  assert.match(labels, /Risk:\/executive-risk/)
})
