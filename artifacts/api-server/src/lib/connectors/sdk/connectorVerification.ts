import { connectorRegistry } from './connectorRegistry'
import type { ConnectorContext, ConnectorProvider } from './connectorTypes'

export function verifyConnectorAction(provider: ConnectorProvider, context: ConnectorContext, actionId: string) { return connectorRegistry.get(provider).verifyAction(context, actionId) }
