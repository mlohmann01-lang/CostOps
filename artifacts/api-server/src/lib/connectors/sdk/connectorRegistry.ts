import type { BaseConnector } from './baseConnector'
import type { ConnectorProvider } from './connectorTypes'

export class ConnectorRegistry {
  private readonly connectors = new Map<ConnectorProvider, BaseConnector>()

  register(connector: BaseConnector): void {
    if (this.connectors.has(connector.provider)) throw new Error(`Connector already registered: ${connector.provider}`)
    this.connectors.set(connector.provider, connector)
  }

  get(provider: ConnectorProvider): BaseConnector {
    const connector = this.connectors.get(provider)
    if (!connector) throw new Error(`Connector not registered: ${provider}`)
    return connector
  }

  has(provider: ConnectorProvider): boolean { return this.connectors.has(provider) }
  list(): ConnectorProvider[] { return Array.from(this.connectors.keys()) }
  clearForTests(): void { this.connectors.clear() }
}

export const connectorRegistry = new ConnectorRegistry()
