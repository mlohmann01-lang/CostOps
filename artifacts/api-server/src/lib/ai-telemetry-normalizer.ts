/**
 * AI Telemetry Normalizer
 *
 * Converts RawAITelemetryEvent arrays into NormalizedAITelemetryEvent arrays,
 * applying vendor-agnostic field extraction and error-tolerant batch ingestion.
 */

import type {
  RawAITelemetryEvent,
  NormalizedAITelemetryEvent,
  TelemetryIngestionResult,
} from './ai-telemetry-types.js'

const DATA_VERSION = '1.0.0'

/** Extract a string value from an unknown payload, returning null if absent or non-string. */
function extractString(payload: Record<string, unknown>, key: string): string | null {
  const v = payload[key]
  return typeof v === 'string' ? v : null
}

/** Extract a number value from an unknown payload, returning defaultVal if absent or non-number. */
function extractNumber(payload: Record<string, unknown>, key: string, defaultVal = 0): number {
  const v = payload[key]
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (isFinite(n)) return n
  }
  return defaultVal
}

/** Extract a boolean value from an unknown payload, returning null if absent or non-boolean. */
function extractBoolean(payload: Record<string, unknown>, key: string): boolean | null {
  const v = payload[key]
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}

/** Build a zero-cost normalized event shell from a raw event. */
function buildZeroEvent(raw: RawAITelemetryEvent, nowAt: string): NormalizedAITelemetryEvent {
  return {
    eventId: `norm-${raw.eventId}`,
    connectorId: raw.connectorId,
    eventType: raw.eventType,
    tenantId: raw.tenantId,
    modelId: null,
    userId: null,
    workflowId: null,
    agentId: null,
    inputTokens: 0,
    outputTokens: 0,
    costUSD: 0,
    seatActive: null,
    seatLastActiveAt: null,
    embeddingDimensions: null,
    normalizedAt: nowAt,
    rawEventId: raw.eventId,
    dataVersion: DATA_VERSION,
  }
}

/**
 * Normalize a TOKEN_USAGE event.
 * Extracts modelId, userId, inputTokens, outputTokens, costUSD from rawPayload.
 */
export function normalizeTokenUsageEvent(raw: RawAITelemetryEvent): NormalizedAITelemetryEvent {
  const nowAt = new Date().toISOString()
  const p = raw.rawPayload
  return {
    eventId: `norm-${raw.eventId}`,
    connectorId: raw.connectorId,
    eventType: raw.eventType,
    tenantId: raw.tenantId,
    modelId: extractString(p, 'modelId') ?? extractString(p, 'model'),
    userId: extractString(p, 'userId') ?? extractString(p, 'user_id'),
    workflowId: extractString(p, 'workflowId') ?? extractString(p, 'workflow_id'),
    agentId: extractString(p, 'agentId') ?? extractString(p, 'agent_id'),
    inputTokens: extractNumber(p, 'inputTokens') || extractNumber(p, 'prompt_tokens'),
    outputTokens: extractNumber(p, 'outputTokens') || extractNumber(p, 'completion_tokens'),
    costUSD: extractNumber(p, 'costUSD') || extractNumber(p, 'cost_usd'),
    seatActive: null,
    seatLastActiveAt: null,
    embeddingDimensions: null,
    normalizedAt: nowAt,
    rawEventId: raw.eventId,
    dataVersion: DATA_VERSION,
  }
}

/**
 * Normalize a SEAT_ACTIVITY event.
 * Extracts userId, seatActive, seatLastActiveAt from rawPayload.
 */
export function normalizeSeatActivityEvent(raw: RawAITelemetryEvent): NormalizedAITelemetryEvent {
  const nowAt = new Date().toISOString()
  const p = raw.rawPayload
  return {
    eventId: `norm-${raw.eventId}`,
    connectorId: raw.connectorId,
    eventType: raw.eventType,
    tenantId: raw.tenantId,
    modelId: null,
    userId: extractString(p, 'userId') ?? extractString(p, 'user_id'),
    workflowId: null,
    agentId: null,
    inputTokens: 0,
    outputTokens: 0,
    costUSD: 0,
    seatActive: extractBoolean(p, 'seatActive') ?? extractBoolean(p, 'seat_active'),
    seatLastActiveAt:
      extractString(p, 'seatLastActiveAt') ?? extractString(p, 'seat_last_active_at'),
    embeddingDimensions: null,
    normalizedAt: nowAt,
    rawEventId: raw.eventId,
    dataVersion: DATA_VERSION,
  }
}

/**
 * Normalize an AGENT_ACTIVITY event.
 * Extracts agentId, modelId, userId, token counts, and cost from rawPayload.
 */
function normalizeAgentActivityEvent(raw: RawAITelemetryEvent): NormalizedAITelemetryEvent {
  const nowAt = new Date().toISOString()
  const p = raw.rawPayload
  return {
    eventId: `norm-${raw.eventId}`,
    connectorId: raw.connectorId,
    eventType: raw.eventType,
    tenantId: raw.tenantId,
    modelId: extractString(p, 'modelId') ?? extractString(p, 'model'),
    userId: extractString(p, 'userId') ?? extractString(p, 'user_id'),
    workflowId: extractString(p, 'workflowId') ?? extractString(p, 'workflow_id'),
    agentId: extractString(p, 'agentId') ?? extractString(p, 'agent_id'),
    inputTokens: extractNumber(p, 'inputTokens') || extractNumber(p, 'prompt_tokens'),
    outputTokens: extractNumber(p, 'outputTokens') || extractNumber(p, 'completion_tokens'),
    costUSD: extractNumber(p, 'costUSD') || extractNumber(p, 'cost_usd'),
    seatActive: null,
    seatLastActiveAt: null,
    embeddingDimensions: null,
    normalizedAt: nowAt,
    rawEventId: raw.eventId,
    dataVersion: DATA_VERSION,
  }
}

/**
 * Normalize a WORKSPACE_ACTIVITY event.
 * Treats similarly to SEAT_ACTIVITY but includes userId and workspace context.
 */
function normalizeWorkspaceActivityEvent(raw: RawAITelemetryEvent): NormalizedAITelemetryEvent {
  const nowAt = new Date().toISOString()
  const p = raw.rawPayload
  return {
    eventId: `norm-${raw.eventId}`,
    connectorId: raw.connectorId,
    eventType: raw.eventType,
    tenantId: raw.tenantId,
    modelId: extractString(p, 'modelId') ?? extractString(p, 'model'),
    userId: extractString(p, 'userId') ?? extractString(p, 'user_id'),
    workflowId: extractString(p, 'workflowId') ?? extractString(p, 'workflow_id'),
    agentId: null,
    inputTokens: extractNumber(p, 'inputTokens'),
    outputTokens: extractNumber(p, 'outputTokens'),
    costUSD: extractNumber(p, 'costUSD'),
    seatActive: extractBoolean(p, 'seatActive') ?? extractBoolean(p, 'seat_active'),
    seatLastActiveAt:
      extractString(p, 'seatLastActiveAt') ?? extractString(p, 'seat_last_active_at'),
    embeddingDimensions: null,
    normalizedAt: nowAt,
    rawEventId: raw.eventId,
    dataVersion: DATA_VERSION,
  }
}

/**
 * Normalize an EMBEDDING_USAGE event.
 * Extracts modelId, userId, inputTokens, embeddingDimensions, costUSD.
 */
function normalizeEmbeddingUsageEvent(raw: RawAITelemetryEvent): NormalizedAITelemetryEvent {
  const nowAt = new Date().toISOString()
  const p = raw.rawPayload
  const dims = extractNumber(p, 'embeddingDimensions') || extractNumber(p, 'dimensions')
  return {
    eventId: `norm-${raw.eventId}`,
    connectorId: raw.connectorId,
    eventType: raw.eventType,
    tenantId: raw.tenantId,
    modelId: extractString(p, 'modelId') ?? extractString(p, 'model'),
    userId: extractString(p, 'userId') ?? extractString(p, 'user_id'),
    workflowId: extractString(p, 'workflowId') ?? extractString(p, 'workflow_id'),
    agentId: null,
    inputTokens: extractNumber(p, 'inputTokens') || extractNumber(p, 'token_count'),
    outputTokens: 0,
    costUSD: extractNumber(p, 'costUSD') || extractNumber(p, 'cost_usd'),
    seatActive: null,
    seatLastActiveAt: null,
    embeddingDimensions: dims > 0 ? dims : null,
    normalizedAt: nowAt,
    rawEventId: raw.eventId,
    dataVersion: DATA_VERSION,
  }
}

/**
 * Normalize a BILLING_EXPORT event.
 * Extracts cost, model, and token counts from the billing line item payload.
 */
function normalizeBillingExportEvent(raw: RawAITelemetryEvent): NormalizedAITelemetryEvent {
  const nowAt = new Date().toISOString()
  const p = raw.rawPayload
  return {
    eventId: `norm-${raw.eventId}`,
    connectorId: raw.connectorId,
    eventType: raw.eventType,
    tenantId: raw.tenantId,
    modelId: extractString(p, 'modelId') ?? extractString(p, 'model') ?? extractString(p, 'sku'),
    userId: extractString(p, 'userId') ?? extractString(p, 'user_id'),
    workflowId: extractString(p, 'workflowId') ?? extractString(p, 'workflow_id'),
    agentId: extractString(p, 'agentId') ?? extractString(p, 'agent_id'),
    inputTokens: extractNumber(p, 'inputTokens') || extractNumber(p, 'prompt_tokens'),
    outputTokens: extractNumber(p, 'outputTokens') || extractNumber(p, 'completion_tokens'),
    costUSD:
      extractNumber(p, 'costUSD') ||
      extractNumber(p, 'cost_usd') ||
      extractNumber(p, 'amount_usd'),
    seatActive: null,
    seatLastActiveAt: null,
    embeddingDimensions: null,
    normalizedAt: nowAt,
    rawEventId: raw.eventId,
    dataVersion: DATA_VERSION,
  }
}

/**
 * Dispatch normalization by eventType.
 * For unhandled event types, returns a zero-cost event.
 */
export function normalizeEvent(raw: RawAITelemetryEvent): NormalizedAITelemetryEvent {
  switch (raw.eventType) {
    case 'TOKEN_USAGE':
      return normalizeTokenUsageEvent(raw)
    case 'SEAT_ACTIVITY':
      return normalizeSeatActivityEvent(raw)
    case 'AGENT_ACTIVITY':
      return normalizeAgentActivityEvent(raw)
    case 'WORKSPACE_ACTIVITY':
      return normalizeWorkspaceActivityEvent(raw)
    case 'EMBEDDING_USAGE':
      return normalizeEmbeddingUsageEvent(raw)
    case 'BILLING_EXPORT':
      return normalizeBillingExportEvent(raw)
    default: {
      // Exhaustiveness guard — return zero event for any future eventType additions
      const nowAt = new Date().toISOString()
      return buildZeroEvent(raw, nowAt)
    }
  }
}

/**
 * Normalize a batch of raw telemetry events for a given tenant and connector.
 * Errors during normalization are caught and counted; those events are skipped.
 *
 * Returns the ingestion result metadata plus the normalized event array.
 */
export function normalizeEvents(
  tenantId: string,
  connectorId: string,
  rawEvents: RawAITelemetryEvent[],
): TelemetryIngestionResult & { events: NormalizedAITelemetryEvent[] } {
  const ingestedAt = new Date().toISOString()
  const events: NormalizedAITelemetryEvent[] = []
  let errorCount = 0
  let skippedEventCount = 0

  for (const raw of rawEvents) {
    // Validate that the event belongs to the declared tenant/connector
    if (raw.tenantId !== tenantId || raw.connectorId !== connectorId) {
      skippedEventCount++
      continue
    }
    try {
      const normalized = normalizeEvent(raw)
      events.push(normalized)
    } catch {
      errorCount++
    }
  }

  return {
    tenantId,
    connectorId,
    rawEventCount: rawEvents.length,
    normalizedEventCount: events.length,
    skippedEventCount,
    errorCount,
    ingestedAt,
    events,
  }
}
