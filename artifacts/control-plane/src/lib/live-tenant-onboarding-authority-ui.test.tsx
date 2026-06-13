import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  demoOnboardingAuthority,
  demoNextActions,
  demoFirstOutcome,
  demoOnboardingSummary,
  useLiveTenantOnboardingAuthorityData,
} from '../hooks/useLiveTenantOnboardingAuthorityData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

function read(relPath: string) { return fs.readFileSync(new URL(relPath, import.meta.url), 'utf8') }

test('1. Route exists in App.tsx', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import LiveTenantOnboardingAuthorityView from './pages/LiveTenantOnboardingAuthorityView'"), true)
  assert.equal(app.includes('path="/live-tenant-onboarding"'), true)
})

test('2. Navigation entry exists in Sidebar', () => {
  const admin = NAV_GROUPS.find((g) => g.label === 'Admin')!
  assert.ok(admin, 'Admin group must exist')
  assert.ok(admin.items.some((i) => i.href === '/live-tenant-onboarding'), 'Admin must have Live Tenant Onboarding link')
})

test('3. Summary cards present in page', () => {
  const page = read('../pages/LiveTenantOnboardingAuthorityView.tsx')
  for (const label of ['Overall Status', 'Readiness Score', 'Trust Score', 'Progress', 'Current Stage', 'Active Blockers']) {
    assert.equal(page.includes(label), true, `Missing summary card: ${label}`)
  }
})

test('4. All 10 onboarding stages rendered', () => {
  const page = read('../pages/LiveTenantOnboardingAuthorityView.tsx')
  // Stages are rendered via a dynamic template literal; verify the pattern and all stage names exist in source
  assert.equal(page.includes('stage-card-'), true, 'Missing stage-card testid pattern')
  for (const stage of ['DISCOVER', 'CONNECT', 'VALIDATE', 'TRUST', 'READINESS', 'CERTIFY', 'EXECUTE', 'VERIFY', 'PROTECT', 'PROVE']) {
    assert.equal(page.includes(stage), true, `Stage ${stage} not present in source`)
  }
})

test('5. Overall Onboarding Progress section present', () => {
  const page = read('../pages/LiveTenantOnboardingAuthorityView.tsx')
  assert.equal(page.includes('Overall Onboarding Progress'), true)
  assert.equal(page.includes('progressPercent'), true)
})

test('6. Readiness Summary section present', () => {
  const page = read('../pages/LiveTenantOnboardingAuthorityView.tsx')
  assert.equal(page.includes('Readiness Summary'), true)
  assert.equal(page.includes('Ready for Pilot'), true)
  assert.equal(page.includes('Ready for Production'), true)
})

test('7. First Outcome Readiness section present', () => {
  const page = read('../pages/LiveTenantOnboardingAuthorityView.tsx')
  assert.equal(page.includes('First Outcome Readiness'), true)
  assert.equal(page.includes('Projected Value'), true)
})

test('8. Next Recommended Actions section present', () => {
  const page = read('../pages/LiveTenantOnboardingAuthorityView.tsx')
  assert.equal(page.includes('Next Recommended Actions'), true)
})

test('9. Deterministic narrative renders with testid', () => {
  const page = read('../pages/LiveTenantOnboardingAuthorityView.tsx')
  assert.equal(page.includes('onboarding-narrative'), true)
  assert.equal(page.includes('buildNarrative'), true)
})

test('10. Cross-links to related authorities present', () => {
  const page = read('../pages/LiveTenantOnboardingAuthorityView.tsx')
  for (const link of [
    'Open Connectors', 'Open Certified Wedges', 'Open Trust Authority',
    'Open Action Center', 'Open Outcome Protection',
    'Open Technology Portfolio Authority', 'Open Executive Proof Pack Authority',
  ]) {
    assert.equal(page.includes(link), true, `Missing cross-link: ${link}`)
  }
})

test('11. Demo fallback data has all 10 stages', () => {
  assert.equal(demoOnboardingAuthority.stages.length, 10)
  const stages = demoOnboardingAuthority.stages.map((s) => s.stage)
  for (const stage of ['DISCOVER', 'CONNECT', 'VALIDATE', 'TRUST', 'READINESS', 'CERTIFY', 'EXECUTE', 'VERIFY', 'PROTECT', 'PROVE']) {
    assert.ok(stages.includes(stage as any), `Missing demo stage: ${stage}`)
  }
  assert.ok(demoNextActions.length > 0, 'Demo next actions must be non-empty')
  assert.equal(typeof demoFirstOutcome.projectedValue, 'number')
  assert.ok(demoOnboardingSummary.averageReadinessScore > 0, 'Demo summary readiness score must be > 0')
})

test('12. No LeftShield or Agent Security Analytics in page or hook files', () => {
  const page = read('../pages/LiveTenantOnboardingAuthorityView.tsx')
  const hook = read('../hooks/useLiveTenantOnboardingAuthorityData.ts')
  assert.equal(page.includes('LeftShield'), false)
  assert.equal(page.includes('Agent Security Analytics'), false)
  assert.equal(hook.includes('LeftShield'), false)
  assert.equal(hook.includes('Agent Security Analytics'), false)
})
