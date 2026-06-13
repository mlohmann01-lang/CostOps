import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoTechnologyPortfolioAuthority, technologyPortfolioAuthorityApiPaths, useTechnologyPortfolioAuthorityData } from '../hooks/useTechnologyPortfolioAuthorityData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

function read(relPath: string) { return fs.readFileSync(new URL(relPath, import.meta.url), 'utf8') }

test('1. Route exists', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import TechnologyPortfolioAuthorityView from './pages/TechnologyPortfolioAuthorityView'"), true)
  assert.equal(app.includes('path="/technology-portfolio-authority"'), true)
})

test('2. Navigation entry exists', () => {
  const intelligence = NAV_GROUPS.find((g) => g.label === 'Intelligence')!
  assert.ok(intelligence, 'Intelligence group must exist')
  assert.ok(intelligence.items.some((i) => i.href === '/technology-portfolio-authority'), 'Intelligence must have Technology Portfolio Authority link')
})

test('3. Summary cards render', () => {
  const page = read('../pages/TechnologyPortfolioAuthorityView.tsx')
  for (const label of ['Total Assets', 'Certified Assets', 'Annual Cost', 'Annual Value', 'Protected Value', 'Owner Coverage', 'Governance Coverage', 'High Risk Assets']) {
    assert.equal(page.includes(label), true, `Missing card: ${label}`)
  }
})

test('4. Domain breakdown renders all eight wedges', () => {
  const page = read('../pages/TechnologyPortfolioAuthorityView.tsx')
  assert.equal(page.includes('Domain Breakdown'), true)
  for (const w of ['M365', 'AI', 'SERVICENOW', 'AWS', 'AZURE', 'SNOWFLAKE', 'DATABRICKS', 'ITAM']) {
    assert.equal(page.includes(w), true, `Missing wedge in domain breakdown: ${w}`)
  }
})

test('5. Asset table renders', () => {
  const page = read('../pages/TechnologyPortfolioAuthorityView.tsx')
  assert.equal(page.includes('Portfolio Asset Table'), true)
  for (const col of ['Name', 'Type', 'Source Wedge', 'Vendor', 'Owner', 'Cost Centre', 'Annual Cost', 'Annual Value', 'Protected Value', 'Utilisation', 'Risk', 'Certification', 'Status']) {
    assert.equal(page.includes(col), true, `Missing column: ${col}`)
  }
})

test('6. Owners section renders', () => {
  const page = read('../pages/TechnologyPortfolioAuthorityView.tsx')
  assert.equal(page.includes('Owners'), true)
  for (const col of ['Owner', 'Business Unit', 'Cost Centre', 'Assets', 'Actions', 'Outcomes']) {
    assert.equal(page.includes(col), true, `Missing owner column: ${col}`)
  }
})

test('7. Contracts and renewals render', () => {
  const page = read('../pages/TechnologyPortfolioAuthorityView.tsx')
  assert.equal(page.includes('Contracts'), true)
  assert.equal(page.includes('Renewals'), true)
  for (const col of ['Vendor', 'Contract', 'Renewal Date', 'Days Until Renewal', 'Annual Value', 'Risk', 'Linked Assets']) {
    assert.equal(page.includes(col), true, `Missing contracts column: ${col}`)
  }
})

test('8. Risk and opportunity section renders', () => {
  const page = read('../pages/TechnologyPortfolioAuthorityView.tsx')
  assert.equal(page.includes('Risk'), true)
  assert.equal(page.includes('Opportunity'), true)
  for (const section of ['Top Risk Assets', 'Low Utilisation', 'High Cost Assets', 'Drifted Assets', 'Upcoming Renewals', 'Missing Owner', 'Missing Cost Centre']) {
    assert.equal(page.includes(section), true, `Missing risk section: ${section}`)
  }
})

test('9. Detail drawer renders', () => {
  const page = read('../pages/TechnologyPortfolioAuthorityView.tsx')
  assert.equal(page.includes('AssetDetail'), true)
  assert.equal(page.includes('selectedAsset'), true)
  for (const field of ['Asset Summary', 'Certification Source', 'Governed Actions', 'Protected Outcomes', 'Evidence']) {
    assert.equal(page.includes(field), true, `Missing drawer field: ${field}`)
  }
  assert.equal(page.includes('onClose'), true)
})

test('10. Deterministic narrative renders', () => {
  const page = read('../pages/TechnologyPortfolioAuthorityView.tsx')
  assert.equal(page.includes('Deterministic Narrative'), true)
  assert.equal(page.includes('buildNarrative'), true)
  assert.equal(page.includes('Technology Portfolio Authority is tracking'), true)
  assert.equal(page.includes('Owner coverage is'), true)
  assert.equal(page.includes('of annual value is protected'), true)
  assert.equal(page.includes('high-risk assets require remediation'), true)
  assert.equal(page.includes('missing owners, upcoming renewals and drifted protected outcomes'), true)
  // deterministic — no AI generation
  const hook = read('../hooks/useTechnologyPortfolioAuthorityData.ts')
  assert.equal(hook.includes('openai') || hook.includes('anthropic'), false)
})

test('11. Cross-links render', () => {
  const page = read('../pages/TechnologyPortfolioAuthorityView.tsx')
  for (const label of ['Open Certified Wedges', 'Open Live Tenant Readiness', 'Open Action Center', 'Open Executive Value', 'Open Outcome Protection', 'Open Evidence Packs']) {
    assert.equal(page.includes(label), true, `Missing cross-link: ${label}`)
  }
})

test('12. Demo fallback works', () => {
  const page = read('../pages/TechnologyPortfolioAuthorityView.tsx')
  const hook = read('../hooks/useTechnologyPortfolioAuthorityData.ts')
  assert.equal(typeof useTechnologyPortfolioAuthorityData, 'function')
  assert.deepEqual([...technologyPortfolioAuthorityApiPaths], ['/api/technology-portfolio/health', '/api/technology-portfolio/assets', '/api/technology-portfolio/owners', '/api/technology-portfolio/contracts', '/api/technology-portfolio/renewals'])
  assert.equal(page.includes('Demo fallback data'), true)
  assert.equal(page.includes('Portfolio APIs unavailable. Showing demo fallback data.'), true)
  assert.equal(hook.includes('demoTechnologyPortfolioAuthority'), true)
  assert.equal(hook.includes('isDemo'), true)
  assert.ok(demoTechnologyPortfolioAuthority.assets.length >= 8, 'Demo should cover all 8 wedge domains')
  assert.ok(demoTechnologyPortfolioAuthority.health.totalAnnualCost > 0)
  assert.ok(demoTechnologyPortfolioAuthority.health.protectedAnnualValue > 0)
  const wedges = ['M365', 'AI', 'SERVICENOW', 'AWS', 'AZURE', 'SNOWFLAKE', 'DATABRICKS', 'ITAM'] as const
  for (const w of wedges) {
    assert.ok(demoTechnologyPortfolioAuthority.assets.some((a) => a.sourceWedge === w), `Missing demo asset for wedge: ${w}`)
  }
})

test('13. No LeftShield labels', () => {
  const combined = read('../pages/TechnologyPortfolioAuthorityView.tsx') + read('../hooks/useTechnologyPortfolioAuthorityData.ts')
  assert.equal(combined.includes('LeftShield'), false)
})

test('14. No Agent Security Analytics labels', () => {
  const combined = read('../pages/TechnologyPortfolioAuthorityView.tsx') + read('../hooks/useTechnologyPortfolioAuthorityData.ts')
  assert.equal(combined.includes('Agent Security Analytics'), false)
})
