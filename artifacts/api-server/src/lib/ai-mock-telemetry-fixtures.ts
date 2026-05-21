/**
 * AI Mock Telemetry Fixtures
 *
 * Deterministic mock telemetry events and snapshots covering all 8 AI
 * governance pack scenarios. No Math.random() is used — all values are
 * derived from sequential indices and fixed seeds based on tenantId.
 */

import type {
  NormalizedAITelemetryEvent,
  AITelemetrySnapshot,
  RawAITelemetryEvent,
  ConnectorFreshnessAssessment,
} from './ai-telemetry-types.js'

/** Reference date anchoring all mock timestamps. */
export const MOCK_REFERENCE_DATE = '2026-05-21T00:00:00Z'

const DATA_VERSION = '1.0.0'

/** Derive a small deterministic seed integer from a tenantId string. */
function tenantSeed(tenantId: string): number {
  return tenantId.charCodeAt(0) % 100
}

/** Build an ISO timestamp offset from MOCK_REFERENCE_DATE by the given hours. */
function offsetHours(hours: number): string {
  const base = new Date(MOCK_REFERENCE_DATE).getTime()
  return new Date(base - hours * 60 * 60 * 1000).toISOString()
}

/** Build an ISO timestamp offset from MOCK_REFERENCE_DATE by the given days. */
function offsetDays(days: number): string {
  return offsetHours(days * 24)
}

/**
 * Build a minimal normalized event with sensible defaults.
 * All required fields must be supplied; optional fields default to null/0.
 */
function makeEvent(
  overrides: Partial<NormalizedAITelemetryEvent> &
    Pick<NormalizedAITelemetryEvent, 'eventId' | 'connectorId' | 'eventType' | 'tenantId'>,
): NormalizedAITelemetryEvent {
  return {
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
    normalizedAt: MOCK_REFERENCE_DATE,
    rawEventId: overrides.eventId,
    dataVersion: DATA_VERSION,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Scenario builders
// ---------------------------------------------------------------------------

/**
 * TOKEN_GOVERNANCE — high token spend on GPT-4o when GPT-4o-mini would suffice.
 * Returns 20 events: 10 GPT-4o events (high cost), 10 GPT-4o-mini events (low cost).
 */
export function buildTokenGovernanceScenario(tenantId: string): NormalizedAITelemetryEvent[] {
  const seed = tenantSeed(tenantId)
  const events: NormalizedAITelemetryEvent[] = []

  // 10 GPT-4o events (expensive)
  for (let i = 0; i < 10; i++) {
    events.push(
      makeEvent({
        eventId: `tg-gpt4o-${tenantId}-${i}`,
        connectorId: 'OPENAI',
        eventType: 'TOKEN_USAGE',
        tenantId,
        modelId: 'gpt-4o',
        userId: `user-${(seed + i) % 5}`,
        workflowId: `wf-simple-${i % 3}`,
        inputTokens: 1200 + i * 100,
        outputTokens: 300 + i * 20,
        costUSD: 0.042 + i * 0.003,
        normalizedAt: offsetHours(i),
        rawEventId: `raw-tg-gpt4o-${tenantId}-${i}`,
      }),
    )
  }

  // 10 GPT-4o-mini events (cheap) — same tasks as above
  for (let i = 0; i < 10; i++) {
    events.push(
      makeEvent({
        eventId: `tg-mini-${tenantId}-${i}`,
        connectorId: 'OPENAI',
        eventType: 'TOKEN_USAGE',
        tenantId,
        modelId: 'gpt-4o-mini',
        userId: `user-${(seed + i) % 5}`,
        workflowId: `wf-simple-${i % 3}`,
        inputTokens: 1150 + i * 95,
        outputTokens: 290 + i * 18,
        costUSD: 0.0012 + i * 0.00009,
        normalizedAt: offsetHours(i + 10),
        rawEventId: `raw-tg-mini-${tenantId}-${i}`,
      }),
    )
  }

  return events
}

/**
 * MODEL_ROUTING — tasks that don't need premium models going to GPT-4o.
 * Returns 15 events covering classification of simple vs complex tasks.
 */
export function buildModelRoutingScenario(tenantId: string): NormalizedAITelemetryEvent[] {
  const seed = tenantSeed(tenantId)
  const events: NormalizedAITelemetryEvent[] = []

  // 10 simple-task events incorrectly routed to GPT-4o
  for (let i = 0; i < 10; i++) {
    events.push(
      makeEvent({
        eventId: `mr-premium-${tenantId}-${i}`,
        connectorId: 'OPENAI',
        eventType: 'TOKEN_USAGE',
        tenantId,
        modelId: 'gpt-4o',
        userId: `user-${(seed + i) % 4}`,
        workflowId: `wf-classify-${i % 5}`,
        inputTokens: 400 + i * 30,
        outputTokens: 80 + i * 5,
        costUSD: 0.014 + i * 0.001,
        normalizedAt: offsetHours(i * 2),
        rawEventId: `raw-mr-premium-${tenantId}-${i}`,
      }),
    )
  }

  // 5 complex-task events correctly using GPT-4o
  for (let i = 0; i < 5; i++) {
    events.push(
      makeEvent({
        eventId: `mr-correct-${tenantId}-${i}`,
        connectorId: 'OPENAI',
        eventType: 'TOKEN_USAGE',
        tenantId,
        modelId: 'gpt-4o',
        userId: `user-${(seed + i) % 4}`,
        workflowId: `wf-complex-${i}`,
        inputTokens: 3000 + i * 500,
        outputTokens: 800 + i * 100,
        costUSD: 0.105 + i * 0.018,
        normalizedAt: offsetHours(i * 3 + 20),
        rawEventId: `raw-mr-correct-${tenantId}-${i}`,
      }),
    )
  }

  return events
}

/**
 * AI_VENDOR_SEAT_RECLAIM — idle Cursor + OpenAI seats.
 * Returns 20 seat activity events with 8 idle seats.
 */
export function buildVendorSeatReclaimScenario(tenantId: string): NormalizedAITelemetryEvent[] {
  const seed = tenantSeed(tenantId)
  const events: NormalizedAITelemetryEvent[] = []

  // 12 active seats (6 Cursor, 6 OpenAI)
  for (let i = 0; i < 6; i++) {
    events.push(
      makeEvent({
        eventId: `vsr-cursor-active-${tenantId}-${i}`,
        connectorId: 'CURSOR',
        eventType: 'SEAT_ACTIVITY',
        tenantId,
        userId: `user-active-${(seed + i) % 10}`,
        seatActive: true,
        seatLastActiveAt: offsetDays(i % 3),
        normalizedAt: MOCK_REFERENCE_DATE,
        rawEventId: `raw-vsr-cursor-active-${tenantId}-${i}`,
      }),
    )
    events.push(
      makeEvent({
        eventId: `vsr-oai-active-${tenantId}-${i}`,
        connectorId: 'OPENAI',
        eventType: 'SEAT_ACTIVITY',
        tenantId,
        userId: `user-active-${(seed + i) % 10}`,
        seatActive: true,
        seatLastActiveAt: offsetDays(i % 2),
        normalizedAt: MOCK_REFERENCE_DATE,
        rawEventId: `raw-vsr-oai-active-${tenantId}-${i}`,
      }),
    )
  }

  // 8 idle seats — last active > 30 days ago
  for (let i = 0; i < 8; i++) {
    const connector = i % 2 === 0 ? 'CURSOR' : 'OPENAI'
    events.push(
      makeEvent({
        eventId: `vsr-idle-${tenantId}-${i}`,
        connectorId: connector,
        eventType: 'SEAT_ACTIVITY',
        tenantId,
        userId: `user-idle-${(seed + i) % 8}`,
        seatActive: false,
        seatLastActiveAt: offsetDays(35 + i * 3),
        normalizedAt: MOCK_REFERENCE_DATE,
        rawEventId: `raw-vsr-idle-${tenantId}-${i}`,
      }),
    )
  }

  return events
}

/**
 * AGENT_RUNTIME_GOVERNANCE — 3 agents with high spend, 1 with zero activity.
 * Returns 25 events mixing AGENT_ACTIVITY with TOKEN_USAGE.
 */
export function buildAgentRuntimeScenario(tenantId: string): NormalizedAITelemetryEvent[] {
  const seed = tenantSeed(tenantId)
  const events: NormalizedAITelemetryEvent[] = []

  const activeAgents = ['agent-alpha', 'agent-beta', 'agent-gamma']

  // 8 AGENT_ACTIVITY events per active agent (24 total)
  for (let a = 0; a < 3; a++) {
    const agentId = activeAgents[a]
    for (let i = 0; i < 8; i++) {
      events.push(
        makeEvent({
          eventId: `ar-activity-${tenantId}-${agentId}-${i}`,
          connectorId: 'ANTHROPIC',
          eventType: 'AGENT_ACTIVITY',
          tenantId,
          agentId,
          modelId: 'claude-sonnet-4-6',
          userId: `user-${(seed + a + i) % 5}`,
          inputTokens: 2000 + a * 500 + i * 200,
          outputTokens: 600 + a * 150 + i * 60,
          costUSD: 0.072 + a * 0.018 + i * 0.007,
          normalizedAt: offsetHours(a * 8 + i),
          rawEventId: `raw-ar-activity-${tenantId}-${agentId}-${i}`,
        }),
      )
    }
  }

  // 1 idle agent — zero AGENT_ACTIVITY events; represented by 1 TOKEN_USAGE with zero spend
  events.push(
    makeEvent({
      eventId: `ar-idle-${tenantId}-0`,
      connectorId: 'ANTHROPIC',
      eventType: 'TOKEN_USAGE',
      tenantId,
      agentId: 'agent-delta',
      modelId: 'claude-sonnet-4-6',
      inputTokens: 0,
      outputTokens: 0,
      costUSD: 0,
      normalizedAt: offsetDays(7),
      rawEventId: `raw-ar-idle-${tenantId}-0`,
    }),
  )

  return events
}

/**
 * CONTEXT_GOVERNANCE — context windows 80%+ full.
 * Returns 15 events with inflated inputTokens indicating context bloat.
 */
export function buildContextGovernanceScenario(tenantId: string): NormalizedAITelemetryEvent[] {
  const seed = tenantSeed(tenantId)
  const events: NormalizedAITelemetryEvent[] = []

  // GPT-4o context limit ~128k tokens; 80% = ~102,400
  for (let i = 0; i < 15; i++) {
    const bloat = i < 10 // first 10 are bloated
    events.push(
      makeEvent({
        eventId: `cg-${tenantId}-${i}`,
        connectorId: 'OPENAI',
        eventType: 'TOKEN_USAGE',
        tenantId,
        modelId: 'gpt-4o',
        userId: `user-${(seed + i) % 6}`,
        workflowId: `wf-cg-${i % 4}`,
        // Bloated: 105,000+ input tokens; normal: ~4,000
        inputTokens: bloat ? 105000 + i * 1000 : 4000 + i * 200,
        outputTokens: bloat ? 2000 + i * 100 : 800 + i * 50,
        costUSD: bloat ? 1.155 + i * 0.011 : 0.044 + i * 0.002,
        normalizedAt: offsetHours(i * 2),
        rawEventId: `raw-cg-${tenantId}-${i}`,
      }),
    )
  }

  return events
}

/**
 * AI_ROI_GOVERNANCE — no outcome tracking, high spend.
 * Returns 20 events with costUSD but null workflowId (no outcome linkage).
 */
export function buildROIGovernanceScenario(tenantId: string): NormalizedAITelemetryEvent[] {
  const seed = tenantSeed(tenantId)
  const events: NormalizedAITelemetryEvent[] = []

  for (let i = 0; i < 20; i++) {
    events.push(
      makeEvent({
        eventId: `roi-${tenantId}-${i}`,
        connectorId: 'OPENAI',
        eventType: 'TOKEN_USAGE',
        tenantId,
        modelId: i % 3 === 0 ? 'gpt-4o' : 'gpt-4o-mini',
        userId: `user-${(seed + i) % 7}`,
        workflowId: null, // No outcome linkage — the governance signal
        inputTokens: 800 + i * 60,
        outputTokens: 200 + i * 15,
        costUSD: 0.028 + i * 0.0015,
        normalizedAt: offsetHours(i * 3),
        rawEventId: `raw-roi-${tenantId}-${i}`,
      }),
    )
  }

  return events
}

/**
 * AI_DRIFT_GOVERNANCE — token spend spiking week-over-week.
 * Returns 30 events: first 10 at baseline, next 20 at 3x baseline.
 */
export function buildDriftGovernanceScenario(tenantId: string): NormalizedAITelemetryEvent[] {
  const seed = tenantSeed(tenantId)
  const events: NormalizedAITelemetryEvent[] = []

  // Baseline week (days 14–7 ago)
  for (let i = 0; i < 10; i++) {
    events.push(
      makeEvent({
        eventId: `dg-baseline-${tenantId}-${i}`,
        connectorId: 'OPENAI',
        eventType: 'TOKEN_USAGE',
        tenantId,
        modelId: 'gpt-4o',
        userId: `user-${(seed + i) % 5}`,
        workflowId: `wf-dg-${i % 3}`,
        inputTokens: 1000 + i * 50,
        outputTokens: 250 + i * 10,
        costUSD: 0.035 + i * 0.0015,
        normalizedAt: offsetDays(14 - i),
        rawEventId: `raw-dg-baseline-${tenantId}-${i}`,
      }),
    )
  }

  // Spike week (last 7 days) — 3x baseline spend
  for (let i = 0; i < 20; i++) {
    events.push(
      makeEvent({
        eventId: `dg-spike-${tenantId}-${i}`,
        connectorId: 'OPENAI',
        eventType: 'TOKEN_USAGE',
        tenantId,
        modelId: 'gpt-4o',
        userId: `user-${(seed + i) % 5}`,
        workflowId: `wf-dg-${i % 3}`,
        inputTokens: 3000 + i * 150,
        outputTokens: 750 + i * 30,
        costUSD: 0.105 + i * 0.0045,
        normalizedAt: offsetDays(7 - Math.floor(i / 3)),
        rawEventId: `raw-dg-spike-${tenantId}-${i}`,
      }),
    )
  }

  return events
}

/**
 * AI_OVERLAP_ELIMINATION — users with both Cursor + Windsurf seats active.
 * Returns 20 seat events: 5 users with BOTH cursor and windsurf seatActive=true.
 */
export function buildOverlapEliminationScenario(tenantId: string): NormalizedAITelemetryEvent[] {
  const seed = tenantSeed(tenantId)
  const events: NormalizedAITelemetryEvent[] = []

  // 5 overlap users: both CURSOR and WINDSURF active
  for (let i = 0; i < 5; i++) {
    const userId = `user-overlap-${(seed + i) % 10}`
    events.push(
      makeEvent({
        eventId: `oe-cursor-${tenantId}-${i}`,
        connectorId: 'CURSOR',
        eventType: 'SEAT_ACTIVITY',
        tenantId,
        userId,
        seatActive: true,
        seatLastActiveAt: offsetDays(i % 3),
        normalizedAt: MOCK_REFERENCE_DATE,
        rawEventId: `raw-oe-cursor-${tenantId}-${i}`,
      }),
    )
    events.push(
      makeEvent({
        eventId: `oe-windsurf-${tenantId}-${i}`,
        connectorId: 'WINDSURF',
        eventType: 'SEAT_ACTIVITY',
        tenantId,
        userId,
        seatActive: true,
        seatLastActiveAt: offsetDays(i % 2),
        normalizedAt: MOCK_REFERENCE_DATE,
        rawEventId: `raw-oe-windsurf-${tenantId}-${i}`,
      }),
    )
  }

  // 10 non-overlapping seat events (5 Cursor-only, 5 Windsurf-only)
  for (let i = 0; i < 5; i++) {
    events.push(
      makeEvent({
        eventId: `oe-cursor-only-${tenantId}-${i}`,
        connectorId: 'CURSOR',
        eventType: 'SEAT_ACTIVITY',
        tenantId,
        userId: `user-cursor-only-${(seed + i) % 15}`,
        seatActive: true,
        seatLastActiveAt: offsetDays(i + 1),
        normalizedAt: MOCK_REFERENCE_DATE,
        rawEventId: `raw-oe-cursor-only-${tenantId}-${i}`,
      }),
    )
    events.push(
      makeEvent({
        eventId: `oe-windsurf-only-${tenantId}-${i}`,
        connectorId: 'WINDSURF',
        eventType: 'SEAT_ACTIVITY',
        tenantId,
        userId: `user-windsurf-only-${(seed + i) % 20}`,
        seatActive: true,
        seatLastActiveAt: offsetDays(i + 2),
        normalizedAt: MOCK_REFERENCE_DATE,
        rawEventId: `raw-oe-windsurf-only-${tenantId}-${i}`,
      }),
    )
  }

  return events
}

// ---------------------------------------------------------------------------
// Raw event fixtures (kept for testing normalizer pipeline)
// ---------------------------------------------------------------------------

/**
 * Build sample RawAITelemetryEvents for a given connectorId and tenantId.
 * These are deliberately minimal — just enough to exercise the normalizer.
 */
export function buildRawTokenUsageEvents(
  tenantId: string,
  connectorId: string,
  count: number,
): RawAITelemetryEvent[] {
  const events: RawAITelemetryEvent[] = []
  const seed = tenantSeed(tenantId)
  for (let i = 0; i < count; i++) {
    events.push({
      eventId: `raw-token-${connectorId}-${tenantId}-${i}`,
      connectorId,
      eventType: 'TOKEN_USAGE',
      tenantId,
      rawPayload: {
        modelId: 'gpt-4o',
        userId: `user-${(seed + i) % 5}`,
        inputTokens: 1000 + i * 100,
        outputTokens: 250 + i * 25,
        costUSD: 0.035 + i * 0.003,
      },
      collectedAt: offsetHours(i),
      sourceVersion: '2024-02-01',
    })
  }
  return events
}

// ---------------------------------------------------------------------------
// Snapshot builder
// ---------------------------------------------------------------------------

type ScenarioKey =
  | 'TOKEN_GOVERNANCE'
  | 'MODEL_ROUTING'
  | 'VENDOR_SEAT_RECLAIM'
  | 'AGENT_RUNTIME'
  | 'CONTEXT_GOVERNANCE'
  | 'ROI_GOVERNANCE'
  | 'DRIFT_GOVERNANCE'
  | 'OVERLAP_ELIMINATION'

/** Derive the primary connectorId used by each scenario. */
function scenarioConnector(scenario: ScenarioKey): string {
  switch (scenario) {
    case 'TOKEN_GOVERNANCE':
    case 'MODEL_ROUTING':
    case 'ROI_GOVERNANCE':
    case 'DRIFT_GOVERNANCE':
    case 'CONTEXT_GOVERNANCE':
      return 'OPENAI'
    case 'VENDOR_SEAT_RECLAIM':
      return 'CURSOR'
    case 'AGENT_RUNTIME':
      return 'ANTHROPIC'
    case 'OVERLAP_ELIMINATION':
      return 'CURSOR'
  }
}

/** Build the normalized event array for a given scenario key. */
function buildScenarioEvents(
  tenantId: string,
  scenario: ScenarioKey,
): NormalizedAITelemetryEvent[] {
  switch (scenario) {
    case 'TOKEN_GOVERNANCE':
      return buildTokenGovernanceScenario(tenantId)
    case 'MODEL_ROUTING':
      return buildModelRoutingScenario(tenantId)
    case 'VENDOR_SEAT_RECLAIM':
      return buildVendorSeatReclaimScenario(tenantId)
    case 'AGENT_RUNTIME':
      return buildAgentRuntimeScenario(tenantId)
    case 'CONTEXT_GOVERNANCE':
      return buildContextGovernanceScenario(tenantId)
    case 'ROI_GOVERNANCE':
      return buildROIGovernanceScenario(tenantId)
    case 'DRIFT_GOVERNANCE':
      return buildDriftGovernanceScenario(tenantId)
    case 'OVERLAP_ELIMINATION':
      return buildOverlapEliminationScenario(tenantId)
  }
}

/**
 * Build a full AITelemetrySnapshot for a given pack scenario.
 * Connector assessments are hardcoded as FRESH / HIGH trust for mock snapshots.
 */
export function buildMockTelemetrySnapshot(
  tenantId: string,
  scenario: ScenarioKey,
): AITelemetrySnapshot {
  const normalizedEvents = buildScenarioEvents(tenantId, scenario)
  const connectorId = scenarioConnector(scenario)

  const connectorAssessment: ConnectorFreshnessAssessment = {
    connectorId,
    tenantId,
    lastSyncAt: offsetHours(1),
    freshnessState: 'FRESH',
    trustLevel: 'HIGH',
    trustScore: 0.9,
    eventCount: normalizedEvents.length,
    stalenessReasonCodes: [],
    assessedAt: MOCK_REFERENCE_DATE,
  }

  return {
    tenantId,
    snapshotId: `mock-snapshot-${scenario}-${tenantId}`,
    periodStartAt: offsetDays(14),
    periodEndAt: MOCK_REFERENCE_DATE,
    connectorAssessments: [connectorAssessment],
    normalizedEvents,
    overallFreshnessState: 'FRESH',
    overallTrustLevel: 'HIGH',
    overallTrustScore: 0.9,
    snapshotGeneratedAt: MOCK_REFERENCE_DATE,
  }
}
