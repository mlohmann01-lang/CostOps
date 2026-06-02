import { connectorRegistry } from './connectorRegistry'
import type { ConnectorContext, ConnectorProvider } from './connectorTypes'

export function evaluateConnectorTrust(provider: ConnectorProvider, context: ConnectorContext) { return connectorRegistry.get(provider).evaluateTrust(context) }
