/**
 * AI Telemetry Freshness Scoring
 *
 * Computes freshness states and trust scores for connector telemetry,
 * used to gate which AI governance packs can run with sufficient confidence.
 */

import type {
  ConnectorFreshnessAssessment,
  TelemetryFreshnessState,
  TelemetryTrustLevel,
  NormalizedAITelemetryEvent,
} from './ai-telemetry-types.js'

export const FRESHNESS_THRESHOLDS = {
  FRESH_HOURS: 4,
  STALE_HOURS: 24,
  MISSING_HOURS: 72,
} as const

/** Minimum event count below which a connector is considered PARTIAL. */
const MINIMUM_EXPECTED_EVENT_COUNT = 5

/**
 * Compute the freshness state of a connector based on the last sync timestamp.
 *
 * Rules (evaluated in priority order):
 *  - MISSING: lastSyncAt is null OR hours since sync > MISSING_HOURS
 *  - STALE:   hours since sync > STALE_HOURS
 *  - PARTIAL: eventCount > 0 but < expectedMinimum
 *  - CONFLICTING: duplicate eventIds detected in the events array
 *  - FRESH:   all checks pass
 */
export function computeFreshnessState(
  lastSyncAt: string | null,
  nowAt: string,
  eventCount = 0,
  events: NormalizedAITelemetryEvent[] = [],
  expectedMinimum = MINIMUM_EXPECTED_EVENT_COUNT,
): TelemetryFreshnessState {
  // MISSING: no sync recorded at all
  if (lastSyncAt === null) return 'MISSING'

  const lastMs = new Date(lastSyncAt).getTime()
  const nowMs = new Date(nowAt).getTime()
  const hoursDiff = (nowMs - lastMs) / (1000 * 60 * 60)

  if (!isFinite(hoursDiff) || hoursDiff > FRESHNESS_THRESHOLDS.MISSING_HOURS) return 'MISSING'
  if (hoursDiff > FRESHNESS_THRESHOLDS.STALE_HOURS) return 'STALE'

  // CONFLICTING: duplicate eventIds present
  const idSet = new Set<string>()
  for (const ev of events) {
    if (idSet.has(ev.eventId)) return 'CONFLICTING'
    idSet.add(ev.eventId)
  }

  // PARTIAL: sync is recent but event volume is too low
  if (eventCount > 0 && eventCount < expectedMinimum) return 'PARTIAL'

  return 'FRESH'
}

/**
 * Map a numeric trust score (0–1) to a categorical trust level.
 *
 *  HIGH        >= 0.8
 *  MEDIUM      >= 0.6
 *  LOW         >= 0.4
 *  INSUFFICIENT < 0.4
 */
export function computeTrustLevel(trustScore: number): TelemetryTrustLevel {
  if (trustScore >= 0.8) return 'HIGH'
  if (trustScore >= 0.6) return 'MEDIUM'
  if (trustScore >= 0.4) return 'LOW'
  return 'INSUFFICIENT'
}

/**
 * Produce a full ConnectorFreshnessAssessment for a given connector.
 *
 * Trust score formula (starting at 1.0):
 *  -0.3  if STALE
 *  -0.6  if MISSING
 *  -0.15 if PARTIAL
 *  -0.2  if CONFLICTING
 *
 * Staleness reason codes:
 *  'NO_SYNC'           — lastSyncAt is null
 *  'SYNC_TOO_OLD'      — lastSyncAt is older than STALE_HOURS
 *  'LOW_EVENT_COUNT'   — eventCount below expected minimum
 *  'DUPLICATE_EVENTS'  — duplicate eventIds detected
 */
export function assessConnectorFreshness(
  connectorId: string,
  tenantId: string,
  lastSyncAt: string | null,
  events: NormalizedAITelemetryEvent[],
  nowAt: string,
): ConnectorFreshnessAssessment {
  const eventCount = events.length
  const stalenessReasonCodes: string[] = []

  // Detect duplicates upfront so we can pass into computeFreshnessState
  const idSet = new Set<string>()
  let hasDuplicates = false
  for (const ev of events) {
    if (idSet.has(ev.eventId)) {
      hasDuplicates = true
      break
    }
    idSet.add(ev.eventId)
  }

  // Collect staleness codes independently
  if (lastSyncAt === null) {
    stalenessReasonCodes.push('NO_SYNC')
  } else {
    const lastMs = new Date(lastSyncAt).getTime()
    const nowMs = new Date(nowAt).getTime()
    const hoursDiff = (nowMs - lastMs) / (1000 * 60 * 60)
    if (!isFinite(hoursDiff) || hoursDiff > FRESHNESS_THRESHOLDS.STALE_HOURS) {
      stalenessReasonCodes.push('SYNC_TOO_OLD')
    }
  }
  if (eventCount > 0 && eventCount < MINIMUM_EXPECTED_EVENT_COUNT) {
    stalenessReasonCodes.push('LOW_EVENT_COUNT')
  }
  if (hasDuplicates) {
    stalenessReasonCodes.push('DUPLICATE_EVENTS')
  }

  const freshnessState = computeFreshnessState(lastSyncAt, nowAt, eventCount, events)

  // Compute trust score
  let trustScore = 1.0
  if (freshnessState === 'MISSING') trustScore -= 0.6
  if (freshnessState === 'STALE') trustScore -= 0.3
  if (freshnessState === 'PARTIAL') trustScore -= 0.15
  if (freshnessState === 'CONFLICTING') trustScore -= 0.2
  trustScore = Math.max(0, Math.min(1, trustScore))

  return {
    connectorId,
    tenantId,
    lastSyncAt,
    freshnessState,
    trustLevel: computeTrustLevel(trustScore),
    trustScore,
    eventCount,
    stalenessReasonCodes,
    assessedAt: nowAt,
  }
}
