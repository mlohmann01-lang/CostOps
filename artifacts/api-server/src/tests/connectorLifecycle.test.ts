import test from 'node:test'
import assert from 'node:assert/strict'
import { BaseConnector } from '../lib/connectors/sdk/baseConnector'
import { runConnectorLifecycle } from '../lib/connectors/sdk/connectorLifecycle'
import { connectorRegistry } from '../lib/connectors/sdk/connectorRegistry'
import { MockConnector } from '../lib/connectors/sdk/mockConnector'
import type { ConnectorCapability, ConnectorContext, ConnectorProvider } from '../lib/connectors/sdk/connectorTypes'

const context: ConnectorContext = { tenantId: 'tenant-lifecycle-sdk', mode: 'APPROVAL_REQUIRED' }

test.beforeEach(() => connectorRegistry.clearForTests())
test.after(() => connectorRegistry.clearForTests())

test('Connector SDK lifecycle returns readiness discovery trust and evidence without execution', async () => {
  connectorRegistry.register(new MockConnector())
  const result = await runConnectorLifecycle('MOCK', context)
  assert.equal(result.status, 'READY')
  assert.equal(result.readiness.status, 'READY')
  assert.equal(result.discovery?.entitiesDiscovered, 3)
  assert.equal(result.trust?.trustBand, 'HIGH')
  assert.ok(result.evidence?.evidencePackId)
})

test('Connector SDK lifecycle stops after blocked readiness', async () => {
  class BlockedConnector extends BaseConnector {
    provider: ConnectorProvider = 'AWS'
    capabilities: ConnectorCapability[] = ['READINESS_CHECK']
    async checkReadiness(ctx: ConnectorContext) { return { provider: this.provider, tenantId: ctx.tenantId, status: 'BLOCKED' as const, blockers: ['missing credentials'], warnings: [], capabilities: this.capabilities, checkedAt: new Date().toISOString() } }
    async discover(): Promise<any> { throw new Error('DISCOVERY_SHOULD_NOT_RUN') }
    async evaluateTrust(): Promise<any> { throw new Error('TRUST_SHOULD_NOT_RUN') }
    async dryRunAction(): Promise<any> { throw new Error('DRY_RUN_SHOULD_NOT_RUN') }
    async executeAction(): Promise<any> { throw new Error('EXECUTION_SHOULD_NOT_RUN') }
    async verifyAction(): Promise<any> { throw new Error('VERIFY_SHOULD_NOT_RUN') }
    async captureEvidence(): Promise<any> { throw new Error('EVIDENCE_SHOULD_NOT_RUN') }
  }
  connectorRegistry.register(new BlockedConnector())
  const result = await runConnectorLifecycle('AWS', context)
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.discovery, null)
  assert.equal(result.trust, null)
  assert.equal(result.evidence, null)
})
