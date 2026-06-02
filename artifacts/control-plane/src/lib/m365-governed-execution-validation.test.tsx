import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('execution page shows M365 eligibility dry run rollback and verification panels', () => {
  const page = fs.readFileSync(new URL('../pages/execution-log.tsx', import.meta.url), 'utf8')
  assert.ok(page.includes('Execution Eligibility'))
  assert.ok(page.includes('Dry Run Result'))
  assert.ok(page.includes('Rollback Plan'))
  assert.ok(page.includes('Verification Result'))
})

test('outcome proof page shows projected approved executed verified timeline', () => {
  const page = fs.readFileSync(new URL('../pages/outcomes.tsx', import.meta.url), 'utf8')
  for (const label of ['Projected', 'Approved', 'Executed', 'Verified']) assert.ok(page.includes(label))
})

test('runtime telemetry shows M365 execution validation status states', () => {
  const page = fs.readFileSync(new URL('../pages/runtime-telemetry.tsx', import.meta.url), 'utf8')
  assert.ok(page.includes('M365 Execution Validation'))
  assert.ok(page.includes('READY'))
  assert.ok(page.includes('BLOCKED'))
  assert.ok(page.includes('MUTATION_DISABLED'))
})
