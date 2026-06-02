import { connectorRegistry } from './connectorRegistry'
import type { ConnectorContext, ConnectorDiscoveryResult, ConnectorEvidenceResult, ConnectorHealthStatus, ConnectorProvider, ConnectorReadinessResult, ConnectorTrustResult } from './connectorTypes'

export interface ConnectorLifecycleResult {
  provider: ConnectorProvider
  tenantId: string
  status: ConnectorHealthStatus
  readiness: ConnectorReadinessResult
  discovery: ConnectorDiscoveryResult | null
  trust: ConnectorTrustResult | null
  evidence: ConnectorEvidenceResult | null
}

export async function runConnectorLifecycle(provider: ConnectorProvider, context: ConnectorContext): Promise<ConnectorLifecycleResult> {
  const connector = connectorRegistry.get(provider)
  const readiness = await connector.checkReadiness(context)
  if (readiness.status === 'FAILED' || readiness.status === 'BLOCKED') return { provider, tenantId: context.tenantId, status: readiness.status, readiness, discovery: null, trust: null, evidence: null }
  const discovery = await connector.discover(context)
  const trust = await connector.evaluateTrust(context)
  const evidence = await connector.captureEvidence(context)
  return { provider, tenantId: context.tenantId, status: trust.trustBand === 'BLOCKED' ? 'BLOCKED' : 'READY', readiness, discovery, trust, evidence }
}
