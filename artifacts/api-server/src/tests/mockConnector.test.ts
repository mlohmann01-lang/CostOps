import test from 'node:test'
import assert from 'node:assert/strict'
import { MockConnector } from '../lib/connectors/sdk/mockConnector'
import type { ConnectorContext } from '../lib/connectors/sdk/connectorTypes'

const context: ConnectorContext = { tenantId: 'tenant-mock-sdk', actorId: 'tester', mode: 'APPROVAL_REQUIRED', correlationId: 'corr-mock' }

test('Mock connector implements readiness discovery trust dry-run execution verification and evidence', async () => {
  const connector = new MockConnector()
  const readiness = await connector.checkReadiness(context)
  assert.equal(readiness.status, 'READY')
  const discovery = await connector.discover(context)
  assert.equal(discovery.entitiesDiscovered, 3)
  assert.equal(discovery.rawEntities.length, 3)
  const trust = await connector.evaluateTrust(context)
  assert.equal(trust.trustScore, 92)
  assert.equal(trust.trustBand, 'HIGH')
  const dryRun = await connector.dryRunAction(context, { actionId: 'mock-action-test' })
  assert.equal(dryRun.safeToExecute, true)
  const execution = await connector.executeAction(context, { actionId: 'mock-action-test' })
  assert.equal(execution.status, 'EXECUTED')
  assert.ok(execution.beforeState)
  assert.ok(execution.afterState)
  assert.ok(execution.evidenceRefs.length > 0)
  const verification = await connector.verifyAction(context, 'mock-action-test')
  assert.equal(verification.verified, true)
  const evidence = await connector.captureEvidence(context, 'mock-action-test')
  assert.match(evidence.evidencePackId, /mock-evidence-pack/)
})
