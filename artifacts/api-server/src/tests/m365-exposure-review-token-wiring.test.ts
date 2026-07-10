import test from 'node:test'
import assert from 'node:assert/strict'

// Proves the fix for "Use the consented token for Exposure Review discovery":
// runExposureReviewDiscovery() must pass a client backed by the connection's own
// stored credentialRef/token, not let M365DiscoveryService fall back to its
// server-wide-env-configured default client. Unlike m365-exposure-review-service.test.ts,
// this file deliberately keeps DATABASE_URL set throughout (matching how it's invoked
// under RUN_DB_INTEGRATION_TESTS) rather than deleting it mid-file.

process.env.M365_CLIENT_ID = 'test-client-id'

import { runExposureReviewDiscovery, __testOnly } from '../lib/connectors/m365/m365-exposure-review-service'
import { m365DiscoveryService } from '../lib/connectors/m365/m365-discovery-service'
import { M365GraphClient } from '../lib/connectors/m365/m365-graph-client'

function withDiscoverSpy<T>(fn: (calls: any[]) => Promise<T>): Promise<T> {
  const calls: any[] = []
  const original = m365DiscoveryService.discover.bind(m365DiscoveryService)
  ;(m365DiscoveryService as any).discover = async (options: any) => {
    calls.push(options)
    return { tenantId: options.tenantId, snapshotId: 'spy-snapshot', status: 'COMPLETED', counts: { users: 0, enabledUsers: 0, disabledUsers: 0, licensedUsers: 0, skus: 0, usageRecords: 0, mailboxes: 0, groups: 0 }, warnings: [], blockers: [], startedAt: new Date().toISOString(), completedAt: new Date().toISOString() }
  }
  return fn(calls).finally(() => { (m365DiscoveryService as any).discover = original })
}

test('discovery for a connection WITH a stored credentialRef is passed a client (backed by that connection\'s own token), not left to the server-wide default', async () => {
  const tenantId = 'tenant-token-wiring-with-ref'
  await __testOnly.connectionStore.upsert({
    id: 'conn-with-ref',
    tenantId,
    status: 'CONNECTED',
    credentialRef: 'mscred_review_session_abc',
    grantedScopes: ['User.Read.All'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  await withDiscoverSpy(async (calls) => {
    await runExposureReviewDiscovery(tenantId)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].tenantId, tenantId)
    assert.ok(calls[0].client instanceof M365GraphClient, 'expected discover() to receive a client built from the connection\'s credentialRef')
  })
})

test('discovery for a connection with NO stored credentialRef preserves prior behaviour (no client passed, falls through to readiness gates)', async () => {
  const tenantId = 'tenant-token-wiring-no-ref'
  await __testOnly.connectionStore.upsert({
    id: 'conn-no-ref',
    tenantId,
    status: 'CONNECTED',
    grantedScopes: ['User.Read.All'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  await withDiscoverSpy(async (calls) => {
    await runExposureReviewDiscovery(tenantId)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].client, undefined)
  })
})

test('the tokenProvider on the wired client is scoped to this connection\'s own tenantId+credentialRef, and reports a clear auth error rather than silently succeeding when no matching credential is stored', async () => {
  const tenantId = 'tenant-token-wiring-bad-ref'
  await __testOnly.connectionStore.upsert({
    id: 'conn-bad-ref',
    tenantId,
    status: 'CONNECTED',
    credentialRef: 'mscred_never_actually_stored',
    grantedScopes: ['User.Read.All'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  await withDiscoverSpy(async (calls) => {
    await runExposureReviewDiscovery(tenantId)
    const client: M365GraphClient = calls[0].client
    await assert.rejects(() => client.authenticate(), (error: any) => error?.code === 'MICROSOFT_AUTH_FAILED' || error?.code === 'TOKEN_FAILED')
  })
})
