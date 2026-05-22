/**
 * Pack Evidence Integration (Part 8)
 *
 * Enables packs to switch evidence source between MOCK (fixtures) and OPENAI_CONNECTOR (real API).
 * Proof graph integration showing connector as the source.
 */

import type { NormalizedAITelemetryEvent } from '../../ai-telemetry-types.js';

export type EvidenceSource = 'MOCK' | 'OPENAI_CONNECTOR';

export type EvidenceSourceConfig = {
  source: EvidenceSource;
  description: string;
  dataQuality: 'REAL' | 'SIMULATED';
  enabled: boolean;
  lastUpdatedAt: string;
};

/**
 * Evidence source manager — allows packs to select which data to use
 */
export class OpenAIEvidenceSourceManager {
  private currentSource: EvidenceSource = 'MOCK';
  private sourceConfigs: Map<EvidenceSource, EvidenceSourceConfig> = new Map([
    [
      'MOCK',
      {
        source: 'MOCK',
        description: 'Simulated fixture data for development and testing',
        dataQuality: 'SIMULATED',
        enabled: true,
        lastUpdatedAt: new Date().toISOString(),
      },
    ],
    [
      'OPENAI_CONNECTOR',
      {
        source: 'OPENAI_CONNECTOR',
        description: 'Real OpenAI Admin API usage and cost data',
        dataQuality: 'REAL',
        enabled: false,
        lastUpdatedAt: new Date().toISOString(),
      },
    ],
  ]);

  /**
   * Get current active evidence source
   */
  getCurrentSource(): EvidenceSource {
    return this.currentSource;
  }

  /**
   * Switch evidence source (MOCK → OPENAI_CONNECTOR or vice versa)
   */
  switchSource(source: EvidenceSource): void {
    if (!this.sourceConfigs.has(source)) {
      throw new Error(`Invalid evidence source: ${source}`);
    }
    const config = this.sourceConfigs.get(source)!;
    if (!config.enabled) {
      throw new Error(`Evidence source not available: ${source}`);
    }
    this.currentSource = source;
  }

  /**
   * Get configuration for a source
   */
  getSourceConfig(source: EvidenceSource): EvidenceSourceConfig {
    const config = this.sourceConfigs.get(source);
    if (!config) {
      throw new Error(`Unknown evidence source: ${source}`);
    }
    return config;
  }

  /**
   * Enable a source (e.g., when OpenAI connector becomes ready)
   */
  enableSource(source: EvidenceSource): void {
    const config = this.sourceConfigs.get(source);
    if (!config) {
      throw new Error(`Unknown evidence source: ${source}`);
    }
    config.enabled = true;
    config.lastUpdatedAt = new Date().toISOString();
  }

  /**
   * Disable a source
   */
  disableSource(source: EvidenceSource): void {
    const config = this.sourceConfigs.get(source);
    if (!config) {
      throw new Error(`Unknown evidence source: ${source}`);
    }
    if (this.currentSource === source) {
      throw new Error(`Cannot disable active evidence source: ${source}`);
    }
    config.enabled = false;
    config.lastUpdatedAt = new Date().toISOString();
  }

  /**
   * List available sources
   */
  listAvailableSources(): EvidenceSourceConfig[] {
    return Array.from(this.sourceConfigs.values());
  }

  /**
   * Tag events with their source (for proof graph integration)
   */
  tagEventsWithSource(events: NormalizedAITelemetryEvent[], source: EvidenceSource): (NormalizedAITelemetryEvent & { evidenceSource: EvidenceSource })[] {
    return events.map((event) => ({
      ...event,
      evidenceSource: source,
    }));
  }

  /**
   * Get source metadata for proof graph node
   */
  getProofGraphSourceNode(source: EvidenceSource): {
    nodeId: string;
    nodeType: string;
    label: string;
    properties: Record<string, unknown>;
  } {
    const config = this.getSourceConfig(source);
    return {
      nodeId: `evidence-source-${source.toLowerCase()}`,
      nodeType: 'EVIDENCE_SOURCE',
      label: source === 'OPENAI_CONNECTOR' ? 'OpenAI Admin API' : 'Mock Fixtures',
      properties: {
        source,
        description: config.description,
        dataQuality: config.dataQuality,
        enabled: config.enabled,
        lastUpdatedAt: config.lastUpdatedAt,
      },
    };
  }
}

export const openaiEvidenceSourceManager = new OpenAIEvidenceSourceManager();
