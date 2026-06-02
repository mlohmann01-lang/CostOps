import { connectorRegistry } from './connectorRegistry'
import type { ConnectorContext, ConnectorProvider } from './connectorTypes'

export function runConnectorDiscovery(provider: ConnectorProvider, context: ConnectorContext) { return connectorRegistry.get(provider).discover(context) }
