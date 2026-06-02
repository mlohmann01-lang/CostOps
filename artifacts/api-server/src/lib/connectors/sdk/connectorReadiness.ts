import { connectorRegistry } from './connectorRegistry'
import type { ConnectorContext, ConnectorProvider } from './connectorTypes'

export function checkConnectorReadiness(provider: ConnectorProvider, context: ConnectorContext) { return connectorRegistry.get(provider).checkReadiness(context) }
