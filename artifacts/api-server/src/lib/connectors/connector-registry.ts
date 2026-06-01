import type { Connector, ConnectorPlatform } from './connector-types'

class ConnectorRegistryV2 {
  private readonly connectors = new Map<string, Connector>()
  register(connector: Connector) { this.connectors.set(connector.connectorId, connector); return connector }
  get(connectorId: string) { return this.connectors.get(connectorId) ?? null }
  list() { return Array.from(this.connectors.values()) }
  listByPlatform(platform: ConnectorPlatform) { return this.list().filter((connector) => connector.platform === platform) }
  clearForTests() { this.connectors.clear() }
}

export const connectorRegistry = new ConnectorRegistryV2()

export function createNotImplementedConnector(connectorId: string, platform: ConnectorPlatform): Connector {
  const now = () => new Date().toISOString()
  return {
    connectorId,
    platform,
    capabilities: { read: false, dryRun: false, execute: false, verify: false },
    async authenticate() { return { connectorId, tenantId: 'unknown', authenticated: false, state: 'NOT_CONFIGURED', error: 'NOT_IMPLEMENTED' } },
    async readiness() { return { connectorId, tenantId: 'unknown', state: 'NOT_IMPLEMENTED', readReady: false, writeReady: false, blockers: ['Connector not implemented'], warnings: [], checkedAt: now() } },
    async health() { return { connectorId, tenantId: 'unknown', state: 'NOT_CONFIGURED', dimensions: { implementation: 'NOT_IMPLEMENTED' }, warnings: [], blockers: ['Connector not implemented'], checkedAt: now() } },
    async discover() { return { connectorId, tenantId: 'unknown', status: 'NOT_IMPLEMENTED', counts: {}, warnings: [], blockers: ['Connector not implemented'], startedAt: now(), completedAt: now() } },
    async trust() { return { connectorId, tenantId: 'unknown', globalTrustScore: 0, globalTrustBand: 'BLOCKED', generatedAt: now() } },
  }
}
