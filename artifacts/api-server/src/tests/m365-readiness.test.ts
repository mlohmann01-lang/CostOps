import test from 'node:test'
import assert from 'node:assert/strict'
import { checkM365Readiness, M365_REQUIRED_READ_PERMISSIONS } from '../lib/connectors/m365/m365-readiness'

test('missing config fails closed as MISSING_CONFIG', async () => {
  const report = await checkM365Readiness({ config: { tenantId: '', clientId: '', clientSecret: '' }, grantedPermissions: [] })
  assert.equal(report.authState, 'MISSING_CONFIG')
  assert.equal(report.readReady, false)
  assert.ok(report.blockers.some((b) => b.includes('Missing M365 config')))
})

test('token failure fails closed', async () => {
  const report = await checkM365Readiness({ config: { tenantId: 't', clientId: 'c', clientSecret: 's' }, grantedPermissions: [...M365_REQUIRED_READ_PERMISSIONS], tokenProvider: async () => ({ error: 'boom' }) })
  assert.equal(report.authState, 'TOKEN_FAILED')
  assert.equal(report.readReady, false)
})

test('Reports.Read.All and AuditLog.Read.All are required but write scopes do not block read readiness', async () => {
  const missingReports = await checkM365Readiness({ config: { tenantId: 't', clientId: 'c', clientSecret: 's' }, grantedPermissions: ['User.Read.All', 'Directory.Read.All', 'Organization.Read.All'], tokenProvider: async () => ({ accessToken: 'token' }) })
  assert.equal(missingReports.authState, 'INSUFFICIENT_PERMISSIONS')
  assert.equal(missingReports.requiredReadPermissions.find((p) => p.permission === 'Reports.Read.All')?.granted, false)
  assert.equal(missingReports.requiredReadPermissions.find((p) => p.permission === 'AuditLog.Read.All')?.granted, false)
  const readReady = await checkM365Readiness({ config: { tenantId: 't', clientId: 'c', clientSecret: 's' }, grantedPermissions: [...M365_REQUIRED_READ_PERMISSIONS], tokenProvider: async () => ({ accessToken: 'token' }) })
  assert.equal(readReady.readReady, true)
  assert.equal(readReady.writeReady, false)
})
