import test from 'node:test'
import assert from 'node:assert/strict'
import { M365HealthService } from '../lib/connectors/m365/m365-health'
import { M365SnapshotRepository } from '../lib/connectors/m365/m365-snapshot-repository'

test('health derives NOT_CONFIGURED or DEGRADED rather than fake healthy without snapshot', async () => {
  const repo = new M365SnapshotRepository(); repo.clearForTests()
  const health = await new M365HealthService(repo).getHealth('tenant-health-none')
  assert.notEqual(health.state, 'HEALTHY')
  assert.ok(['NOT_CONFIGURED', 'FAILED', 'DEGRADED'].includes(health.state))
})

test('health exposes required dimensions', async () => {
  const repo = new M365SnapshotRepository(); repo.clearForTests()
  repo.upsertSnapshot({ snapshot: { snapshotId: 'snap-health', tenantId: 'tenant-health', capturedAt: new Date().toISOString(), source: 'MICROSOFT_GRAPH' }, users: [], licenseAssignments: [], skus: [], usageRecords: [], mailboxes: [], groups: [], discoveryRun: { tenantId: 'tenant-health', snapshotId: 'snap-health', status: 'PARTIAL', counts: { users: 0, enabledUsers: 0, disabledUsers: 0, licensedUsers: 0, skus: 0, usageRecords: 0, mailboxes: 0, groups: 0 }, warnings: [], blockers: [], startedAt: new Date().toISOString(), completedAt: new Date().toISOString() } })
  const health = await new M365HealthService(repo).getHealth('tenant-health')
  for (const key of ['auth', 'permissions', 'usersRead', 'licensesRead', 'usageReportsRead', 'mailboxReportsRead', 'freshness', 'rateLimitRisk']) assert.ok(key in health.dimensions)
})
