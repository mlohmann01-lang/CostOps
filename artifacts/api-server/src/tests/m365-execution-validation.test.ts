import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('M365 execution validation is inactive-user-only and blocks generic execution paths', () => {
  const eligibility = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/execution/m365-execution-eligibility.ts'), 'utf8')
  const execution = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/execution/m365-license-execution-service.ts'), 'utf8')
  assert.ok(eligibility.includes('m365-inactive-user-reclaim'))
  assert.ok(eligibility.includes('INACTIVE_USER_LICENSE_RECLAIM'))
  assert.ok(eligibility.includes('REMOVE_M365_LICENSE'))
  assert.ok(execution.includes('Exactly one license is supported.'))
  assert.ok(execution.includes('Approval Authority must be APPROVED'))
  assert.ok(execution.includes('runM365LicenseReclaimDryRun'))
  assert.ok(execution.includes('Verification readback is required before live mutation.'))
  assert.ok(execution.includes('M365_LICENSE_DRIFT_REGISTERED'))
})
