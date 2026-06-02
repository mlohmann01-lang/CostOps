import { connectorRegistry } from './connectorRegistry'
import type { ConnectorContext, ConnectorProvider } from './connectorTypes'

export function captureConnectorEvidence(provider: ConnectorProvider, context: ConnectorContext, actionId?: string) { return connectorRegistry.get(provider).captureEvidence(context, actionId) }
