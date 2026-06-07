import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { NAV_GROUPS } from '../components/layout/Sidebar'

test('sidebar primary navigation keeps Overview customer-facing label', () => {
  const primaryItems = NAV_GROUPS.flatMap((group) => group.items)
  assert.equal(primaryItems.length <= 11, true)
  assert.equal(primaryItems.some((item) => item.label === 'Overview'), true)
  assert.equal(primaryItems.some((item) => item.label === 'Workspace'), false)
  assert.equal(primaryItems.some((item) => item.label === 'Data Trust'), false)
  assert.equal(fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8').includes('Data trust: 83 HIGH'), true)
})
