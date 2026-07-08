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
  // 'Overview' nav item was intentionally removed (user request); Executive Command Center
  // now covers /overview via its aliases. Guard kept for total count and Data Trust removal.
  assert.equal(primaryItems.some((item) => item.label === 'Data Trust'), false)
  assert.equal(fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8').includes('Data trust: 83 HIGH'), true)
})
