import { connectorRegistry } from './connectorRegistry'
import type { ConnectorContext, ConnectorProvider } from './connectorTypes'

export function dryRunConnectorAction(provider: ConnectorProvider, context: ConnectorContext, action: unknown) { return connectorRegistry.get(provider).dryRunAction(context, action) }
export function executeConnectorAction(provider: ConnectorProvider, context: ConnectorContext, action: unknown) { return connectorRegistry.get(provider).executeAction(context, action) }
