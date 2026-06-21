import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { NAV_GROUPS } from '../components/layout/Sidebar'

test('sidebar primary navigation keeps Overview customer-facing label', () => {
  const primaryItems = NAV_GROUPS.flatMap((group) => group.items)
  // Cap raised from the original 11 as the platform grew legitimate pillar-aligned
  // surfaces (Sprint 7+); intent of this guard (no nav-label regressions) is unchanged.
  // Raised again to 26 for Program 12's Information Governance Authority nav item.
  // Raised again to 27 for Program 13's Tenant Isolation Verification Authority nav item.
  assert.equal(primaryItems.length <= 27, true)
  assert.equal(primaryItems.some((item) => item.label === 'Overview'), true)
  // 'Workspace' is now a distinct Pilot Workspace summary surface (added after this guard was
  // written), not a rename of 'Overview' - the regression this test guards against is Overview
  // itself being renamed/removed, which is covered by the assertion above.
  assert.equal(primaryItems.some((item) => item.label === 'Data Trust'), false)
  assert.equal(fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8').includes('Data trust: 83 HIGH'), true)
})
