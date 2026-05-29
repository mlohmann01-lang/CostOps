import test from 'node:test'
import assert from 'node:assert/strict'
import { generateM365GovernedRecommendations, type M365NormalizedRecommendationUser } from '../lib/playbooks/m365/m365-recommendation-orchestrator'
import { M365RecommendationService } from '../lib/playbooks/m365/m365-recommendation-service'
import { GovernedRecommendationRepository } from '../lib/recommendations/recommendation-repository'

const baseUser = (overrides: Partial<M365NormalizedRecommendationUser> = {}): M365NormalizedRecommendationUser => ({
  tenantId: 'tenant-a',
  userId: 'user-1',
  userPrincipalName: 'user1@contoso.com',
  displayName: 'User One',
  accountEnabled: true,
  assignedLicenses: ['M365_E5'],
  lastLoginDaysAgo: 120,
  lifecycleState: 'TRUSTED',
  confidenceScore: 0.86,
  sourceReferences: ['m365:user:user-1', 'm365:licences:user-1'],
  connectorHealth: 'HEALTHY',
  dataFreshnessScore: 0.9,
  usageSignals: ['low-usage-from-last-login'],
  ...overrides,
})

test('orchestrator emits inactive user reclaim recommendation from normalized M365 user', () => {
  const out = generateM365GovernedRecommendations({ tenantId: 'tenant-a', users: [baseUser()] })
  assert.ok(out.recommendations.some((rec) => rec.playbookId === 'M365_INACTIVE_LICENSED_USER_RECLAIM' && rec.actionType === 'REMOVE_LICENSE'))
})

test('rightsizing recommendation emitted when E5 underuse + proposed E3 positive savings', () => {
  const out = generateM365GovernedRecommendations({ tenantId: 'tenant-a', users: [baseUser({ lastLoginDaysAgo: 55 })] })
  const rec = out.recommendations.find((item) => item.playbookId === 'M365_RIGHTSIZE_LICENSE_V1')
  assert.equal(rec?.actionType, 'RIGHTSIZE_LICENSE')
  assert.ok((rec?.projectedMonthlySavings ?? 0) > 0)
})

test('Copilot utilisation recommendation emitted for unused Copilot assignment', () => {
  const out = generateM365GovernedRecommendations({ tenantId: 'tenant-a', users: [baseUser({ assignedLicenses: ['M365_E3', 'COPILOT'], copilotUsageLevel: 'NONE', lastLoginDaysAgo: 35 })] })
  assert.ok(out.recommendations.some((rec) => rec.playbookId === 'M365_COPILOT_UTILISATION_V1' && rec.actionType === 'RECLAIM_COPILOT_LICENSE'))
})

test('add-on recommendation emitted for unused add-on', () => {
  const out = generateM365GovernedRecommendations({ tenantId: 'tenant-a', users: [baseUser({ assignedLicenses: ['M365_E3', 'VISIO_ADDON'], addonUsageLevel: 'NONE', lastLoginDaysAgo: 35 })] })
  assert.ok(out.recommendations.some((rec) => rec.playbookId === 'M365_ADDON_RECLAMATION_V1' && rec.actionType === 'RECLAIM_ADDON_LICENSE'))
})

test('untrusted lifecycle produces blocked/non-executable recommendation', () => {
  const out = generateM365GovernedRecommendations({ tenantId: 'tenant-a', users: [baseUser({ lifecycleState: 'STALE', connectorHealth: 'DEGRADED' })] })
  assert.ok(out.recommendations.some((rec) => rec.executionReadiness === 'BLOCKED' && rec.blockedReasons.includes('DISCOVERY_NOT_TRUSTED')))
})

test('duplicate recommendation generation upserts, does not duplicate', async () => {
  const repo = new GovernedRecommendationRepository()
  const service = new M365RecommendationService({ repo, eventService: { emit: async (event: any) => event, list: async () => [] } as any, loadUsers: async () => [baseUser({ tenantId: 'tenant-upsert' })] })
  const first = await service.generateForTenant('tenant-upsert')
  const second = await service.generateForTenant('tenant-upsert')
  assert.ok(first.recommendationsCreated > 0)
  assert.equal(second.recommendationsCreated, 0)
  assert.ok(second.recommendationsUpdated > 0)
})

test('no M365 data returns safe empty summary', async () => {
  const service = new M365RecommendationService({ loadUsers: async () => [] })
  const out = await service.generateForTenant('tenant-empty')
  assert.equal(out.scannedUsers, 0)
  assert.equal(out.recommendationsCreated, 0)
  assert.match(out.message ?? '', /No M365/)
})

test('tenant isolation enforced', () => {
  const out = generateM365GovernedRecommendations({ tenantId: 'tenant-a', users: [baseUser({ tenantId: 'tenant-b' })] })
  assert.equal(out.recommendations.length, 0)
  assert.ok(out.errors.some((err) => err.reason.includes('tenant mismatch')))
})

test('generation does not create execution requests', () => {
  const out = generateM365GovernedRecommendations({ tenantId: 'tenant-a', users: [baseUser()] })
  assert.equal(out.recommendations.some((rec: any) => rec.executionRequestId), false)
})
