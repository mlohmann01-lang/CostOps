import test from 'node:test'
import assert from 'node:assert/strict'

// Force "not configured" baseline unless a test explicitly sets M365_CLIENT_ID.
delete process.env.M365_CLIENT_ID
delete process.env.DATABASE_URL

import {
  startExposureReviewConnect,
  handleExposureReviewCallback,
  getExposureReviewConnection,
  runExposureReviewDiscovery,
  getExposureReviewDiscoveryStatus,
  getExposureReviewReport,
  getExposureReviewFindings,
  isExposureReviewM365Configured,
  classifyExposureReviewError,
  __testOnly,
} from '../lib/connectors/m365/m365-exposure-review-service'

test('isExposureReviewM365Configured reflects M365_CLIENT_ID presence', () => {
  delete process.env.M365_CLIENT_ID
  assert.equal(isExposureReviewM365Configured(), false)
  process.env.M365_CLIENT_ID = 'test-client-id'
  assert.equal(isExposureReviewM365Configured(), true)
  delete process.env.M365_CLIENT_ID
})

test('startExposureReviewConnect returns not-configured message when M365_CLIENT_ID absent', async () => {
  delete process.env.M365_CLIENT_ID
  const result = await startExposureReviewConnect({ tenantId: 'tenant-config-test' })
  assert.equal(result.configured, false)
  assert.equal((result as any).reason, 'Microsoft 365 connection is not configured for this environment.')
})

test('startExposureReviewConnect rejects forbidden scopes even when configured', async () => {
  process.env.M365_CLIENT_ID = 'test-client-id'
  const result = await startExposureReviewConnect({ tenantId: 'tenant-forbidden-scope', scopes: ['User.Read.All', 'Mail.Read'] })
  assert.equal(result.configured, true)
  assert.equal((result as any).error, 'FORBIDDEN_SCOPE_REQUESTED')
  delete process.env.M365_CLIENT_ID
})

test('startExposureReviewConnect returns an authorization URL and persists a CONNECTING record when configured', async () => {
  process.env.M365_CLIENT_ID = 'test-client-id'
  const tenantId = 'tenant-connect-start'
  const result = await startExposureReviewConnect({ tenantId })
  assert.equal(result.configured, true)
  assert.ok((result as any).authorizationUrl?.startsWith('https://login.microsoftonline.com/'))
  assert.ok((result as any).state)
  const pending = await __testOnly.connectionStore.get(tenantId, (result as any).state)
  assert.equal(pending?.status, 'CONNECTING')
  delete process.env.M365_CLIENT_ID
})

test('handleExposureReviewCallback reports cancellation when oauth error param present', async () => {
  const result = await handleExposureReviewCallback({ tenantId: 'tenant-cb-cancel', state: 'unknown-state', error: 'access_denied' })
  assert.equal((result as any).error, 'OAUTH_CANCELLED')
  assert.equal((result as any).reason, 'Microsoft 365 connection was cancelled.')
})

test('handleExposureReviewCallback reports cancellation when code missing', async () => {
  const result = await handleExposureReviewCallback({ tenantId: 'tenant-cb-nocode', state: 'some-state' })
  assert.equal((result as any).error, 'OAUTH_CANCELLED')
})

test('handleExposureReviewCallback rejects forbidden granted scopes', async () => {
  const result = await handleExposureReviewCallback({
    tenantId: 'tenant-cb-forbidden',
    state: 'some-state',
    code: 'auth-code',
    scopes: ['User.Read.All', 'Files.ReadWrite.All'],
  })
  assert.equal((result as any).error, 'FORBIDDEN_SCOPE_GRANTED')
  assert.equal((result as any).reason, 'Required read-only permission is missing.')
})

test('handleExposureReviewCallback fails gracefully on invalid state (no matching pending request)', async () => {
  const result = await handleExposureReviewCallback({
    tenantId: 'tenant-cb-invalid-state',
    state: 'never-issued-state',
    code: 'auth-code',
  })
  assert.ok('error' in result)
})

test('runExposureReviewDiscovery fails with reconnect message when no CONNECTED connection exists', async () => {
  const tenantId = 'tenant-discovery-no-connection'
  const run = await runExposureReviewDiscovery(tenantId)
  assert.equal(run.status, 'FAILED')
  assert.ok(run.errors.includes('Microsoft 365 connection expired. Reconnect to continue.'))
  assert.ok(run.steps.every((s) => s.status === 'QUEUED'))
})

test('getExposureReviewDiscoveryStatus returns the most recent run', async () => {
  const tenantId = 'tenant-discovery-status'
  await runExposureReviewDiscovery(tenantId)
  const status = await getExposureReviewDiscoveryStatus(tenantId)
  assert.ok(status)
  assert.equal(status?.tenantId, tenantId)
})

test('getExposureReviewReport returns an honest empty state when no findings exist', async () => {
  const report = await getExposureReviewReport('tenant-report-empty')
  assert.equal((report as any).available, false)
  assert.equal((report as any).reason, 'No discovered data is available yet for this tenant.')
})

test('classifyExposureReviewError maps known codes to exact customer-facing copy', () => {
  assert.equal(classifyExposureReviewError({ code: 'MICROSOFT_AUTH_FAILED' }), 'Microsoft 365 connection was cancelled.')
  assert.equal(classifyExposureReviewError({ code: 'CONSENT_REQUIRED' }), 'Admin consent is required to run the Exposure Review.')
  assert.equal(classifyExposureReviewError({ code: 'FORBIDDEN_SCOPE' }), 'Required read-only permission is missing.')
  assert.equal(classifyExposureReviewError({ code: 'RATE_LIMIT_EXCEEDED' }), 'Microsoft Graph rate limit reached. Discovery will retry.')
  assert.equal(classifyExposureReviewError({ code: 'TOKEN_EXPIRED' }), 'Microsoft 365 connection expired. Reconnect to continue.')
  assert.equal(classifyExposureReviewError({ code: 'SOMETHING_ELSE' }), 'Microsoft 365 Exposure Review could not be completed.')
})

// ─── Tenant isolation ────────────────────────────────────────────────────────

test('tenant isolation: connections, findings and reports for tenant A are invisible to tenant B', async () => {
  const tenantA = 'tenant-iso-a'
  const tenantB = 'tenant-iso-b'

  await __testOnly.connectionStore.upsert({
    id: 'conn-a',
    tenantId: tenantA,
    status: 'CONNECTED',
    grantedScopes: ['User.Read.All'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const connA = await getExposureReviewConnection(tenantA)
  const connB = await getExposureReviewConnection(tenantB)
  assert.ok(connA)
  assert.equal(connB, undefined)

  await __testOnly.findingStore.upsert({
    id: 'finding-a-1',
    tenantId: tenantA,
    type: 'OWNERLESS_LICENSE',
    title: 'x',
    description: 'x',
    impact: 'x',
    recommendedAction: 'x',
    potentialAnnualValue: null,
    confidence: 'LOW',
    evidenceRefs: [],
    source: 'M365_GRAPH_DISCOVERY',
    createdAt: new Date().toISOString(),
  })
  const findingsA = await getExposureReviewFindings(tenantA)
  const findingsB = await getExposureReviewFindings(tenantB)
  assert.equal(findingsA.length, 1)
  assert.equal(findingsB.length, 0)

  const reportA = await getExposureReviewReport(tenantA)
  const reportB = await getExposureReviewReport(tenantB)
  assert.equal('available' in reportA ? reportA.available : true, true)
  assert.equal((reportB as any).available, false)
})

// ─── Runtime safety: this module never performs write/mutation operations ──

test('runtime safety: exposure review service module exposes no execution/mutation/approval functions', async () => {
  const moduleExports = await import('../lib/connectors/m365/m365-exposure-review-service')
  const exportNames = Object.keys(moduleExports)
  const forbiddenNamePattern = /execute|approve|remove|delete|reclaim|mutate|write/i
  const offending = exportNames.filter((name) => forbiddenNamePattern.test(name))
  assert.deepEqual(offending, [], `Exposure review service must not export mutation-capable functions, found: ${offending.join(', ')}`)
})
