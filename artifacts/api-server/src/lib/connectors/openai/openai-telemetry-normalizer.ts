/**
 * Normalization Into Existing AI Telemetry Contracts (Part 5)
 *
 * Transforms raw OpenAI telemetry into the canonical NormalizedAITelemetryEvent format.
 * Sets sourceOfTruth="CONNECTOR" and isEstimated flags based on data completeness.
 */

import type { NormalizedAITelemetryEvent } from '../../ai-telemetry-types.js';
import type { RawOpenAITelemetryBatch } from './openai-raw-telemetry-dto.js';

export type NormalizedOpenAIEvent = NormalizedAITelemetryEvent & {
  sourceOfTruth: 'CONNECTOR'; // Always CONNECTOR for OpenAI
  isEstimated: boolean; // true if any required field is inferred
};

export class OpenAITelemetryNormalizer {
  /**
   * Normalize a batch of raw OpenAI telemetry to canonical schema
   */
  normalizeBatch(batch: RawOpenAITelemetryBatch): NormalizedOpenAIEvent[] {
    const normalized: NormalizedOpenAIEvent[] = [];

    // Normalize usage events (join with cost data where available)
    const usageMap = new Map<string, NormalizedOpenAIEvent>();

    for (const usage of batch.usageEvents) {
      const eventId = `openai-usage-${usage.projectId}-${usage.modelId}-${usage.usageDate}`;
      const isEstimated = !usage.userId || !usage.workflowId;

      const event: NormalizedOpenAIEvent = {
        eventId,
        connectorId: 'OPENAI',
        eventType: 'TOKEN_USAGE',
        tenantId: batch.metadata.tenantId,
        modelId: usage.modelId,
        userId: usage.userId ?? null,
        workflowId: usage.workflowId ?? null,
        agentId: usage.agentId ?? null,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUSD: 0, // Will be filled from cost events
        seatActive: null, // Not applicable for API usage
        seatLastActiveAt: null,
        embeddingDimensions: null, // Not applicable unless embedding model
        normalizedAt: new Date().toISOString(),
        rawEventId: eventId,
        dataVersion: '1.0',
        sourceOfTruth: 'CONNECTOR',
        isEstimated,
      };

      usageMap.set(eventId, event);
    }

    // Merge cost data
    for (const cost of batch.costEvents) {
      const eventId = `openai-usage-${cost.projectId}-${cost.modelId}-${cost.costDate}`;
      const event = usageMap.get(eventId);

      if (event) {
        event.costUSD = cost.costUSD;
        event.isEstimated = event.isEstimated || !cost.userId;
      } else {
        // Cost without corresponding usage event (shouldn't happen, but handle it)
        const newEvent: NormalizedOpenAIEvent = {
          eventId: `openai-cost-${cost.projectId}-${cost.modelId}-${cost.costDate}`,
          connectorId: 'OPENAI',
          eventType: 'BILLING_EXPORT',
          tenantId: batch.metadata.tenantId,
          modelId: cost.modelId,
          userId: cost.userId ?? null,
          workflowId: null,
          agentId: null,
          inputTokens: 0, // Unknown
          outputTokens: 0, // Unknown
          costUSD: cost.costUSD,
          seatActive: null,
          seatLastActiveAt: null,
          embeddingDimensions: null,
          normalizedAt: new Date().toISOString(),
          rawEventId: `openai-cost-${cost.projectId}-${cost.modelId}-${cost.costDate}`,
          dataVersion: '1.0',
          sourceOfTruth: 'CONNECTOR',
          isEstimated: true, // Partial data
        };
        normalized.push(newEvent);
      }
    }

    // Add all usage events (some may be cost-only, but include all)
    normalized.push(...Array.from(usageMap.values()));

    return normalized;
  }

  /**
   * Compute data quality flags for a normalized batch
   */
  assessDataQuality(
    normalized: NormalizedOpenAIEvent[],
  ): {
    estimatedFraction: number; // 0–1
    usageDataComplete: boolean;
    costDataComplete: boolean;
    attributionComplete: boolean;
  } {
    const totalEvents = normalized.length;
    if (totalEvents === 0) {
      return {
        estimatedFraction: 0,
        usageDataComplete: true,
        costDataComplete: true,
        attributionComplete: true,
      };
    }

    const estimatedCount = normalized.filter((e) => e.isEstimated).length;
    const estimatedFraction = estimatedCount / totalEvents;

    const usageDataComplete = normalized.every((e) => e.inputTokens > 0 || e.outputTokens > 0 || e.costUSD > 0);
    const costDataComplete = normalized.every((e) => e.costUSD > 0);
    const attributionComplete = normalized.every((e) => e.userId !== null && e.workflowId !== null);

    return {
      estimatedFraction,
      usageDataComplete,
      costDataComplete,
      attributionComplete,
    };
  }
}

export const openaiTelemetryNormalizer = new OpenAITelemetryNormalizer();
