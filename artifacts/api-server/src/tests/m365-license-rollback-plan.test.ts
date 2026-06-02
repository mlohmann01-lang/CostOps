import test from 'node:test'
import assert from 'node:assert/strict'
import { buildM365LicenseRollbackPlan } from '../lib/execution/m365-license-rollback-plan'

test('rollback plan supports one direct ADD_LICENSE readiness and blocks group assignment', () => {
  const ready = buildM365LicenseRollbackPlan({ tenantId: 't', userId: 'u', skuId: 'sku', userExists: true, assignmentType: 'DIRECT' })
  assert.equal(ready.supported, true)
  assert.ok(ready.steps.some((step) => step.includes('ADD_LICENSE')))
  const blocked = buildM365LicenseRollbackPlan({ tenantId: 't', userId: 'u', skuId: 'sku', userExists: true, assignmentType: 'GROUP' })
  assert.equal(blocked.supported, false)
})
