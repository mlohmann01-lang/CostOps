import test from 'node:test'
import assert from 'node:assert/strict'
import { M365LicenseExecutionService, clearM365LicenseExecutionMemoryForTests } from '../lib/execution/m365-license-execution-service'
import { outcomeProofService } from '../lib/outcomes/outcome-proof-service'
import { inactiveReclaimOpportunity, trustReport, executionSnapshot } from './m365-execution-test-fixture'

test('execution service enforces approval, mutation flag, one user/license, verification, outcome proof, and drift registration', async () => {
  clearM365LicenseExecutionMemoryForTests(); outcomeProofService.clearForTests()
  const calls: any[] = []
  const service = new M365LicenseExecutionService()
  const base = { executionRequestId: 'exec-1', tenantId: 'tenant-exec', opportunity: inactiveReclaimOpportunity(), snapshot: executionSnapshot(), trust: trustReport('HIGH'), approvalState: 'APPROVED', userId: 'u1', skuIds: ['sku-e5'], writeReady: true, graphClient: { removeLicense: async (input: any) => { calls.push(input); return { status: 'REMOVED', ...input } } }, readAssignedLicensesAfterMutation: async () => [] }
  delete process.env.M365_ENABLE_LIVE_LICENSE_MUTATION
  assert.equal((await service.execute(base)).status, 'MUTATION_DISABLED')
  process.env.M365_ENABLE_LIVE_LICENSE_MUTATION = 'true'
  const executed = await service.execute(base)
  assert.equal(executed.status, 'EXECUTED')
  assert.equal(calls.length, 1)
  assert.equal(executed.verification?.status, 'VERIFIED')
  assert.ok(executed.outcomeProof?.verifiedMonthlySavings > 0)
  assert.ok(executed.driftRule?.monitors.includes('USER_RECEIVES_SAME_LICENSE_AGAIN'))
  assert.equal((await service.execute({ ...base, executionRequestId: 'exec-2' })).status, 'BLOCKED')
  delete process.env.M365_ENABLE_LIVE_LICENSE_MUTATION
})

test('execution service blocks missing approval and multi-license scope', async () => {
  clearM365LicenseExecutionMemoryForTests()
  process.env.M365_ENABLE_LIVE_LICENSE_MUTATION = 'true'
  const service = new M365LicenseExecutionService()
  const base = { executionRequestId: 'exec-block', tenantId: 'tenant-exec', opportunity: inactiveReclaimOpportunity(), snapshot: executionSnapshot(), trust: trustReport('HIGH'), approvalState: 'PENDING', userId: 'u1', skuIds: ['sku-e5', 'sku-e3'], writeReady: true, graphClient: { removeLicense: async () => ({ status: 'REMOVED' }) }, readAssignedLicensesAfterMutation: async () => [] }
  const out = await service.execute(base as any)
  assert.equal(out.status, 'BLOCKED')
  assert.ok(out.blockers.some((b) => b.includes('Exactly one license')))
  assert.ok(out.blockers.some((b) => b.includes('APPROVED')))
  delete process.env.M365_ENABLE_LIVE_LICENSE_MUTATION
})
