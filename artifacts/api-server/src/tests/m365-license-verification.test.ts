import test from 'node:test'
import assert from 'node:assert/strict'
import { M365LicenseVerificationService } from '../lib/execution/m365-license-verification-service'

test('verification succeeds when license existed and remains removed', async () => {
  const out = await new M365LicenseVerificationService().verify({ tenantId: 't', userId: 'u', skuId: 'sku', beforeAssignedSkuIds: ['sku'], currentAssignedSkuIds: [], projectedMonthlySavings: 10 })
  assert.equal(out.status, 'VERIFIED')
  assert.equal(out.verifiedMonthlySavings, 10)
})

test('verification fails when license remains assigned', async () => {
  const out = await new M365LicenseVerificationService().verify({ tenantId: 't', userId: 'u', skuId: 'sku', beforeAssignedSkuIds: ['sku'], currentAssignedSkuIds: ['sku'], projectedMonthlySavings: 10 })
  assert.equal(out.status, 'FAILED')
})


test('verification requires readback evidence and fails if any source still has sku', async () => {
  const svc = new M365LicenseVerificationService()
  const pending = await svc.verify({ tenantId: 't', userId: 'u', skuId: 'sku', beforeAssignedSkuIds: ['sku'], projectedMonthlySavings: 10 })
  assert.equal(pending.status, 'PENDING')
  const failed = await svc.verify({ tenantId: 't', userId: 'u', skuId: 'sku', beforeAssignedSkuIds: ['sku'], currentAssignedSkuIds: [], currentLicenseDetailSkuIds: ['sku'], projectedMonthlySavings: 10 })
  assert.equal(failed.status, 'FAILED')
})
