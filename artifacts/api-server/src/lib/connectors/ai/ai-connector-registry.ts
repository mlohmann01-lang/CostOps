import type { BaseAIConnector, AIConnectorId, AIConnectorSyncResult } from './ai-connector-types.js'
import { openAIConnector } from './openai-connector.js'
import { anthropicConnector } from './anthropic-connector.js'
import { cursorConnector } from './cursor-connector.js'
import { windsurfConnector } from './windsurf-connector.js'

export class AIConnectorRegistry {
  private readonly connectors = new Map<AIConnectorId, BaseAIConnector>()

  register(connector: BaseAIConnector): void {
    this.connectors.set(connector.id, connector)
  }

  get(id: AIConnectorId): BaseAIConnector | undefined {
    return this.connectors.get(id)
  }

  list(): BaseAIConnector[] {
    return [...this.connectors.values()]
  }

  async syncAll(tenantId: string): Promise<AIConnectorSyncResult[]> {
    const results: AIConnectorSyncResult[] = []
    for (const connector of this.connectors.values()) {
      try {
        const result = await connector.runSync(tenantId)
        results.push(result)
      } catch (e) {
        results.push({
          connectorId: connector.id,
          tenantId,
          syncedAt: new Date().toISOString(),
          usageRecords: [],
          seatRecords: [],
          health: 'FAILED',
          errorMessage: e instanceof Error ? e.message : String(e),
        })
      }
    }
    return results
  }

  healthSummary(): Record<string, boolean> {
    const summary: Record<string, boolean> = {}
    for (const connector of this.connectors.values()) {
      summary[connector.id] = true
    }
    return summary
  }
}

export const globalAIConnectorRegistry = new AIConnectorRegistry()

globalAIConnectorRegistry.register(openAIConnector)
globalAIConnectorRegistry.register(anthropicConnector)
globalAIConnectorRegistry.register(cursorConnector)
globalAIConnectorRegistry.register(windsurfConnector)

export { openAIConnector, anthropicConnector, cursorConnector, windsurfConnector }
