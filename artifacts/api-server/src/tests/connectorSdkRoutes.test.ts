import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import connectorSdkRouter from '../routes/connector-sdk'
import { connectorRegistry } from '../lib/connectors/sdk/connectorRegistry'
import { registerMockConnector } from '../lib/connectors/sdk/mockConnector'

const app = express()
app.use(express.json())
app.use((req: any, _res, next) => { req.tenantId = req.header('x-tenant-id') ?? 'tenant-sdk-routes'; next() })
app.use('/api/connectors/sdk', connectorSdkRouter)
let baseUrl = ''
let server: any

test.before(async () => {
  connectorRegistry.clearForTests()
  registerMockConnector()
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`
})

test.after(async () => { await new Promise((resolve) => server.close(resolve)); connectorRegistry.clearForTests() })

test('Connector SDK provider list includes MOCK', async () => {
  const res = await fetch(`${baseUrl}/api/connectors/sdk/providers`, { headers: { 'x-tenant-id': 'tenant-sdk-routes' } })
  const body = await res.json() as any
  assert.equal(res.status, 200)
  assert.equal(body.providers.includes('MOCK'), true)
})

test('Connector SDK lifecycle route works for MOCK', async () => {
  const res = await fetch(`${baseUrl}/api/connectors/sdk/MOCK/lifecycle`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': 'tenant-sdk-routes' }, body: JSON.stringify({ mode: 'APPROVAL_REQUIRED' }) })
  const body = await res.json() as any
  assert.equal(res.status, 200)
  assert.equal(body.status, 'READY')
  assert.equal(body.discovery.entitiesDiscovered, 3)
  assert.equal(body.trust.trustBand, 'HIGH')
  assert.ok(body.evidence.evidencePackId)
})

test('Connector SDK dry-run and execute require actor and return mock before after evidence', async () => {
  const missingActor = await fetch(`${baseUrl}/api/connectors/sdk/MOCK/dry-run`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': 'tenant-sdk-routes' }, body: JSON.stringify({ action: { actionId: 'mock-route-action' } }) })
  assert.equal(missingActor.status, 400)
  const dryRun = await fetch(`${baseUrl}/api/connectors/sdk/MOCK/dry-run`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': 'tenant-sdk-routes' }, body: JSON.stringify({ actorId: 'route-tester', action: { actionId: 'mock-route-action' } }) })
  const dryRunBody = await dryRun.json() as any
  assert.equal(dryRunBody.safeToExecute, true)
  const executed = await fetch(`${baseUrl}/api/connectors/sdk/MOCK/execute`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': 'tenant-sdk-routes' }, body: JSON.stringify({ actorId: 'route-tester', action: { actionId: 'mock-route-action' } }) })
  const executionBody = await executed.json() as any
  assert.equal(executionBody.status, 'EXECUTED')
  assert.ok(executionBody.beforeState)
  assert.ok(executionBody.afterState)
})
