import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTenantEvidencePack } from '../lib/evidence-pack/evidence-pack-builder'
import { OpportunityRepository } from '../lib/opportunities/opportunity-repository'
import { platformEventService } from '../lib/events/platform-event-service'

test('builder assembles tenant evidence pack from existing authorities', async () => {
  const repo = new OpportunityRepository(); repo.clearForTests()
  repo.upsert('tenant-ep', { id: 'opp-1', tenantId: 'tenant-ep', source: 'M365_PLAYBOOK', sourceReferenceId: 'src-1', title: 'Inactive user reclaim', description: 'desc', domain: 'M365', projectedMonthlySavings: 100, projectedAnnualSavings: 1200, confidenceScore: 90, trustScore: 85, readiness: 'APPROVAL_REQUIRED', status: 'DISCOVERED', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), urgency: 'HIGH', evidence: [{ ref: 'e1' }] })
  await platformEventService.recordApprovalEvent('tenant-ep', 'APPROVAL_APPROVED', { entityType: 'APPROVAL', entityId: 'approval-1' })
  await platformEventService.recordExecutionEvent('tenant-ep', 'EXECUTION_DRY_RUN_COMPLETED', { entityType: 'EXECUTION', entityId: 'exec-1' })
  const pack = await buildTenantEvidencePack({ tenantId: 'tenant-ep', scope: 'TENANT' })
  assert.equal(pack.scope, 'TENANT')
  assert.equal(pack.status, 'COMPLETE')
  assert.ok(pack.sections.some((section) => section.type === 'DISCOVERY'))
  assert.ok(pack.sections.some((section) => section.type === 'TRUST'))
  assert.ok(pack.sections.some((section) => section.type === 'OPPORTUNITY'))
  assert.ok(pack.metrics.completeness > 0)
  assert.equal(pack.summary.opportunities, 1)
})
