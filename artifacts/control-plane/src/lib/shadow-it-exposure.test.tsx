import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoShadowITExposureData, normalizeShadowITExposurePayload } from '../hooks/useShadowITExposureData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('ShadowITExposure renders header and KPI row', () => {
  const page = read('../pages/ShadowITExposure.tsx')
  for (const snippet of ['Shadow IT Exposure', 'Discover unapproved SaaS, AI tools, duplicate applications, dormant apps, and governance exposure.', 'Read-only intelligence', 'Workspace Mode', 'Sample governance dataset', 'Applications Discovered', 'Unknown / Unapproved Apps', 'AI Applications', 'Duplicate Capability Findings', 'Potential Annual Savings', 'Governance Exposure Score']) assert.equal(page.includes(snippet), true)
  assert.equal(page.includes("data-testid='shadow-it-kpis'"), true)
})

test('Shadow IT demo data renders core TMG applications', () => {
  const names = demoShadowITExposureData.findings.map((finding) => finding.applicationName).join(' | ')
  for (const app of ['ChatGPT', 'Notion', 'Dropbox', 'Miro', 'Figma']) assert.equal(names.includes(app), true)
})

test('ShadowITExposure renders AI duplicate evidence and governance actions sections', () => {
  const page = read('../pages/ShadowITExposure.tsx')
  for (const snippet of ['AI Application Exposure', 'AI governance exposure', 'Duplicate Capability', 'Dropbox', 'OneDrive', 'Miro', 'Lucid', 'Evidence Panel', 'Enterprise App ID', 'OAuth App ID', 'Sign-in record ID', 'Recommended Governance Actions', 'Assign application owner', 'Review approval status', 'Validate usage', 'Consolidate duplicate tools', 'Review AI policy coverage', 'Create exception or remediation plan']) assert.equal(page.includes(snippet), true)
})

test('Shadow IT route and sidebar link are wired', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import ShadowITExposure from './pages/ShadowITExposure'"), true)
  assert.equal(app.includes('/shadow-it-exposure'), true)
  const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => `${item.label}:${item.href}`)).join(' | ')
  assert.match(labels, /Shadow IT Exposure:\/shadow-it-exposure/)
})

test('Shadow IT page survives missing API/live data', () => {
  const data = normalizeShadowITExposurePayload({})
  assert.equal(data.summary.title, 'Shadow IT Exposure')
  assert.equal(data.findings.length, 0)
  assert.equal(data.opportunities.length, 0)
  assert.equal(data.governanceExposureScore, demoShadowITExposureData.summary.governanceExposureScore)
})

test('Shadow IT savings only appears for supported opportunity types', () => {
  const governanceExposure = demoShadowITExposureData.opportunities.find((opportunity) => opportunity.opportunityType === 'GOVERNANCE_EXPOSURE')
  const rationalization = demoShadowITExposureData.opportunities.find((opportunity) => opportunity.opportunityType === 'RATIONALIZATION')
  assert.equal(governanceExposure?.potentialAnnualSavings, undefined)
  assert.equal(typeof rationalization?.potentialAnnualSavings, 'number')
})
