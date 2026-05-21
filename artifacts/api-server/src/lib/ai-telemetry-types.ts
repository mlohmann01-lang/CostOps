/**
 * Canonical AI Telemetry Contracts
 *
 * Defines the raw and normalized telemetry event schemas used as input
 * to all 8 AI governance packs in the Economic Operations Layer.
 */

// Raw telemetry event (pre-normalization, from provider APIs)
export type RawAITelemetryEvent = {
  eventId: string
  connectorId: string // 'OPENAI' | 'ANTHROPIC' | 'CURSOR' | 'WINDSURF' | 'AZURE_OPENAI' | 'GOOGLE_AI' | 'PERPLEXITY'
  eventType:
    | 'TOKEN_USAGE'
    | 'SEAT_ACTIVITY'
    | 'BILLING_EXPORT'
    | 'AGENT_ACTIVITY'
    | 'WORKSPACE_ACTIVITY'
    | 'EMBEDDING_USAGE'
  tenantId: string
  rawPayload: Record<string, unknown>
  collectedAt: string // ISO timestamp
  sourceVersion: string // API version from provider
}

// Normalized telemetry event (post-normalization, canonical schema)
export type NormalizedAITelemetryEvent = {
  eventId: string
  connectorId: string
  eventType: RawAITelemetryEvent['eventType']
  tenantId: string
  modelId: string | null
  userId: string | null
  workflowId: string | null
  agentId: string | null
  inputTokens: number
  outputTokens: number
  costUSD: number
  seatActive: boolean | null
  seatLastActiveAt: string | null
  embeddingDimensions: number | null
  normalizedAt: string
  rawEventId: string
  dataVersion: string // normalization schema version
}

// Telemetry data freshness state
export type TelemetryFreshnessState = 'FRESH' | 'STALE' | 'MISSING' | 'PARTIAL' | 'CONFLICTING'

// Telemetry trust level
export type TelemetryTrustLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'

// Freshness assessment for a connector
export type ConnectorFreshnessAssessment = {
  connectorId: string
  tenantId: string
  lastSyncAt: string | null
  freshnessState: TelemetryFreshnessState
  trustLevel: TelemetryTrustLevel
  trustScore: number // 0–1
  eventCount: number
  stalenessReasonCodes: string[]
  assessedAt: string
}

// Telemetry snapshot for a tenant — used as the input to all 8 AI packs
export type AITelemetrySnapshot = {
  tenantId: string
  snapshotId: string
  periodStartAt: string
  periodEndAt: string
  connectorAssessments: ConnectorFreshnessAssessment[]
  normalizedEvents: NormalizedAITelemetryEvent[]
  overallFreshnessState: TelemetryFreshnessState
  overallTrustLevel: TelemetryTrustLevel
  overallTrustScore: number
  snapshotGeneratedAt: string
}

// Result of ingesting a batch of telemetry events
export type TelemetryIngestionResult = {
  tenantId: string
  connectorId: string
  rawEventCount: number
  normalizedEventCount: number
  skippedEventCount: number
  errorCount: number
  ingestedAt: string
}
