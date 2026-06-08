import test from 'node:test'
import assert from 'node:assert/strict'
import { buildM365ProductionAuthorityConnector, getM365OnboardingExperience, m365ConnectorSecretStore, m365RawGraphSnapshotStore, validateProductionGates } from '../lib/connectors/m365/m365-production-authority'
import { m365SnapshotRepository, type M365SnapshotBundle } from '../lib/connectors/m365/m365-snapshot-repository'

function seedBundle(tenantId = 'tenant-authority'): M365SnapshotBundle {
  const snapshotId = `snap-${tenantId}`
  return {
    snapshot: { snapshotId, tenantId, capturedAt: new Date().toISOString(), source: 'MICROSOFT_GRAPH', organizationId: 'org-1', displayName: 'Certen Test' },
    users: [
      { id: 'u-inactive', tenantId, userPrincipalName: 'inactive@example.com', displayName: 'Inactive User', accountEnabled: true, userType: 'Member', department: 'Finance', assignedLicenses: ['sku-e3'], signInActivity: { lastSignInDateTime: '2025-01-01T00:00:00Z' }, sourceSnapshotId: snapshotId },
      { id: 'u-copilot', tenantId, userPrincipalName: 'copilot@example.com', displayName: 'Copilot User', accountEnabled: true, department: 'Sales', userType: 'Member', assignedLicenses: ['sku-copilot'], signInActivity: { lastSignInDateTime: '2025-01-01T00:00:00Z' }, sourceSnapshotId: snapshotId },
      { id: 'u-unresolved', tenantId, userPrincipalName: '', displayName: 'No Identity', accountEnabled: true, userType: 'Member', assignedLicenses: ['sku-e5'], sourceSnapshotId: snapshotId },
    ],
    licenseAssignments: [
      { id: 'l1', tenantId, userId: 'u-inactive', skuId: 'sku-e3', skuPartNumber: 'SPE_E3', assignmentType: 'DIRECT', sourceSnapshotId: snapshotId },
      { id: 'l2', tenantId, userId: 'u-copilot', skuId: 'sku-copilot', skuPartNumber: 'M365_COPILOT', assignmentType: 'DIRECT', sourceSnapshotId: snapshotId },
      { id: 'l3', tenantId, userId: 'u-unresolved', skuId: 'sku-e5', skuPartNumber: 'SPE_E5', assignmentType: 'DIRECT', sourceSnapshotId: snapshotId },
    ],
    skus: [
      { skuId: 'sku-e3', skuPartNumber: 'SPE_E3', prepaidEnabled: 10, consumedUnits: 1 },
      { skuId: 'sku-copilot', skuPartNumber: 'M365_COPILOT', prepaidEnabled: 10, consumedUnits: 1 },
      { skuId: 'sku-e5', skuPartNumber: 'SPE_E5', prepaidEnabled: 10, consumedUnits: 1 },
    ],
    usageRecords: [],
    mailboxes: [],
    groups: [{ id: 'g-finance', displayName: 'Finance' }],
    discoveryRun: { tenantId, snapshotId, status: 'COMPLETED', counts: { users: 3, enabledUsers: 3, disabledUsers: 0, licensedUsers: 3, skus: 3, usageRecords: 0, mailboxes: 0, groups: 1 }, warnings: [], blockers: [], startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
  }
}

test('production authority normalizes raw Graph snapshots before identity, trust, recommendations, evidence, and ledger', async () => {
  m365SnapshotRepository.clearForTests()
  const tenantId = 'tenant-authority'
  m365SnapshotRepository.upsertSnapshot(seedBundle(tenantId))
  const connector = buildM365ProductionAuthorityConnector(tenantId)
  await connector.connect({ tenantId, clientId: 'client', clientSecret: 'secret', scopes: ['User.Read.All'] })
  assert.equal(m365ConnectorSecretStore.get(`m365:${tenantId}`)?.clientSecret, 'secret')

  const run = await connector.runEndToEnd({ skipDiscovery: true, actor: 'test' })
  assert.equal(run.canonical.users[0].entityType, 'User')
  assert.ok(run.identityResolutions.some((r) => r.state === 'MATCHED' || r.state === 'LIKELY_MATCHED'))
  assert.ok(run.entityTrust.every((t) => typeof t.score === 'number'))
  assert.ok(run.recommendations.length >= 2)
  assert.ok(run.recommendations.every((r) => r.trustScore > 0 && r.evidencePackId))
  assert.ok(run.evidencePacks.every((p) => p.sources.length > 0 && p.identityResolution && p.trustAnalysis.recommendationTrust))
  assert.ok(run.ledger.some((e) => e.eventType === 'RECOMMENDATION_CREATED'))
  assert.equal(run.productionGates.passed, true)
  assert.equal(run.ledgerPersisted, true)
  assert.ok(m365RawGraphSnapshotStore.get(`snap-${tenantId}`).length > 0)
  assert.equal(run.executiveProofPack.evidenceCoverage.coveragePercent, 100)
})



test('authorization code connect validates token exchange before storing refresh token metadata', async () => {
  const tenantId = 'tenant-auth-code'
  const connector = buildM365ProductionAuthorityConnector(tenantId)
  const fetchImpl = async () => new Response(JSON.stringify({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }), { status: 200, headers: { 'request-id': 'req-1' } })
  const result = await connector.connect({ tenantId, clientId: 'client', clientSecret: 'secret', authorizationCode: 'code', redirectUri: 'https://app.example/callback', scopes: ['User.Read.All'], fetchImpl: fetchImpl as typeof fetch })
  assert.equal(result.status, 'CONNECTED')
  assert.equal(result.tokenValidated, true)
  assert.equal(m365ConnectorSecretStore.get(`m365:${tenantId}`)?.refreshToken, 'refresh')
})

test('production gates hard-block recommendations missing trust, evidence, or outcome ledger', () => {
  const gates = validateProductionGates([{ entityType: 'Recommendation', recommendationId: 'rec-1', tenantId: 't1', type: 'LICENSE_RECLAIM', userId: 'u1', skuIds: ['sku'], projectedSavings: 10, trustScore: 0, readiness: 'BLOCKED', evidencePackId: 'ep-1', confidenceDrivers: [], blockingConditions: [], createdAt: new Date().toISOString() }], [], [])
  assert.equal(gates.passed, false)
  assert.ok(gates.blockers.some((b) => b.includes('missing evidence pack')))
  assert.ok(gates.blockers.some((b) => b.includes('missing trust score')))
  assert.ok(gates.blockers.some((b) => b.includes('missing outcome ledger entry')))
})

test('connector exposes required onboarding steps and capabilities', () => {
  const connector = buildM365ProductionAuthorityConnector('tenant-cap')
  assert.deepEqual(getM365OnboardingExperience().map((s) => s.label), ['Connect Microsoft 365', 'Validate Permissions', 'Run Discovery', 'Review Data Trust', 'Generate Opportunities', 'Generate Evidence Packs', 'Executive Review'])
  assert.equal(connector.capabilities().playbooks.length, 3)
  assert.ok(connector.capabilities().gates.includes('Evidence Pack'))
})
