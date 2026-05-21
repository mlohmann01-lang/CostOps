// OpenAI connector that reads usage from OpenAI API
// Supports: READ_TOKEN_USAGE, READ_SEAT_ASSIGNMENTS, READ_BILLING_EXPORT
// In LIVE mode, would call:
//   GET https://api.openai.com/v1/usage
//   GET https://api.openai.com/v1/organization/members

import type {
  AIConnectorId,
  AIConnectorSyncResult,
  AIVendorSeatRecord,
  BaseAIConnector,
  ConnectorMode,
  NormalizedAIUsageRecord,
} from './ai-connector-types'

// ---------------------------------------------------------------------------
// Deterministic mock data helpers
// ---------------------------------------------------------------------------

/** Build an ISO date string N days before the fixed reference date */
function mockDate(daysAgo: number): string {
  // Fixed reference: 2026-05-21 (today per system context)
  const ref = new Date('2026-05-21T00:00:00.000Z')
  ref.setUTCDate(ref.getUTCDate() - daysAgo)
  return ref.toISOString().slice(0, 10)
}

const OPENAI_SEATS: AIVendorSeatRecord[] = [
  {
    userId: 'usr_openai_001',
    email: 'alice@acme.com',
    assignedAt: '2025-11-01',
    lastActiveAt: '2026-05-20',
    lastActiveDaysAgo: 1,
    isIdle: false,
    plan: 'enterprise',
    costPerSeatPerMonth: 30,
  },
  {
    userId: 'usr_openai_002',
    email: 'bob@acme.com',
    assignedAt: '2025-11-01',
    lastActiveAt: '2026-05-19',
    lastActiveDaysAgo: 2,
    isIdle: false,
    plan: 'enterprise',
    costPerSeatPerMonth: 30,
  },
  {
    userId: 'usr_openai_003',
    email: 'carol@acme.com',
    assignedAt: '2025-12-15',
    lastActiveAt: '2026-03-10',
    lastActiveDaysAgo: 72,
    isIdle: true,
    plan: 'enterprise',
    costPerSeatPerMonth: 30,
  },
  {
    userId: 'usr_openai_004',
    email: 'dan@acme.com',
    assignedAt: '2026-01-01',
    lastActiveAt: '2026-02-28',
    lastActiveDaysAgo: 82,
    isIdle: true,
    plan: 'pro',
    costPerSeatPerMonth: 20,
  },
  {
    userId: 'usr_openai_005',
    email: 'eve@acme.com',
    assignedAt: '2026-01-15',
    lastActiveAt: '2026-05-18',
    lastActiveDaysAgo: 3,
    isIdle: false,
    plan: 'enterprise',
    costPerSeatPerMonth: 30,
  },
  {
    userId: 'usr_openai_006',
    email: 'frank@acme.com',
    assignedAt: '2026-02-01',
    lastActiveAt: null,
    lastActiveDaysAgo: null,
    isIdle: true,
    plan: 'enterprise',
    costPerSeatPerMonth: 30,
  },
]

/** Generate usage records for the last 7 days covering GPT-4o and GPT-4o-mini */
function buildOpenAIUsageRecords(tenantId: string): NormalizedAIUsageRecord[] {
  const records: NormalizedAIUsageRecord[] = []

  // GPT-4o: expensive model — fewer requests, high token depth
  const gpt4oBase = [
    { day: 1, inputTokens: 480_000, outputTokens: 120_000, requests: 340, agents: 110, humans: 230 },
    { day: 2, inputTokens: 510_000, outputTokens: 130_000, requests: 360, agents: 130, humans: 230 },
    { day: 3, inputTokens: 460_000, outputTokens: 110_000, requests: 310, agents: 95,  humans: 215 },
    { day: 4, inputTokens: 530_000, outputTokens: 140_000, requests: 390, agents: 145, humans: 245 },
    { day: 5, inputTokens: 495_000, outputTokens: 125_000, requests: 350, agents: 120, humans: 230 },
    { day: 6, inputTokens: 440_000, outputTokens: 105_000, requests: 295, agents: 90,  humans: 205 },
    { day: 7, inputTokens: 420_000, outputTokens: 100_000, requests: 280, agents: 85,  humans: 195 },
  ]

  // GPT-4o pricing: $5.00 / 1M input, $15.00 / 1M output
  for (const row of gpt4oBase) {
    const costUSD =
      (row.inputTokens / 1_000_000) * 5.0 +
      (row.outputTokens / 1_000_000) * 15.0
    records.push({
      tenantId,
      connectorId: 'OPENAI' as AIConnectorId,
      recordDate: mockDate(row.day),
      modelId: 'gpt-4o',
      vendor: 'OpenAI',
      totalInputTokens: row.inputTokens,
      totalOutputTokens: row.outputTokens,
      totalRequests: row.requests,
      totalCostUSD: Math.round(costUSD * 100) / 100,
      activeSeats: 3,
      totalSeats: OPENAI_SEATS.length,
      idleSeats: OPENAI_SEATS.filter((s) => s.isIdle).length,
      agentActivityCount: row.agents,
      humanActivityCount: row.humans,
      averageContextTokens: Math.round(row.inputTokens / row.requests),
      averageOutputTokens: Math.round(row.outputTokens / row.requests),
      retryCount: Math.round(row.requests * 0.03),
      errorCount: Math.round(row.requests * 0.01),
      environment: 'production',
    })
  }

  // GPT-4o-mini: cheap model — high volume, shallow depth
  const miniBase = [
    { day: 1, inputTokens: 2_200_000, outputTokens: 550_000, requests: 4_800, agents: 3_200, humans: 1_600 },
    { day: 2, inputTokens: 2_350_000, outputTokens: 590_000, requests: 5_100, agents: 3_400, humans: 1_700 },
    { day: 3, inputTokens: 2_100_000, outputTokens: 520_000, requests: 4_600, agents: 3_050, humans: 1_550 },
    { day: 4, inputTokens: 2_450_000, outputTokens: 610_000, requests: 5_300, agents: 3_550, humans: 1_750 },
    { day: 5, inputTokens: 2_300_000, outputTokens: 575_000, requests: 5_000, agents: 3_300, humans: 1_700 },
    { day: 6, inputTokens: 2_000_000, outputTokens: 500_000, requests: 4_350, agents: 2_900, humans: 1_450 },
    { day: 7, inputTokens: 1_900_000, outputTokens: 475_000, requests: 4_100, agents: 2_700, humans: 1_400 },
  ]

  // GPT-4o-mini pricing: $0.15 / 1M input, $0.60 / 1M output
  for (const row of miniBase) {
    const costUSD =
      (row.inputTokens / 1_000_000) * 0.15 +
      (row.outputTokens / 1_000_000) * 0.6
    records.push({
      tenantId,
      connectorId: 'OPENAI' as AIConnectorId,
      recordDate: mockDate(row.day),
      modelId: 'gpt-4o-mini',
      vendor: 'OpenAI',
      totalInputTokens: row.inputTokens,
      totalOutputTokens: row.outputTokens,
      totalRequests: row.requests,
      totalCostUSD: Math.round(costUSD * 100) / 100,
      activeSeats: 3,
      totalSeats: OPENAI_SEATS.length,
      idleSeats: OPENAI_SEATS.filter((s) => s.isIdle).length,
      agentActivityCount: row.agents,
      humanActivityCount: row.humans,
      averageContextTokens: Math.round(row.inputTokens / row.requests),
      averageOutputTokens: Math.round(row.outputTokens / row.requests),
      retryCount: Math.round(row.requests * 0.02),
      errorCount: Math.round(row.requests * 0.005),
      environment: 'production',
    })
  }

  return records
}

// ---------------------------------------------------------------------------
// Connector implementation
// ---------------------------------------------------------------------------

class OpenAIConnector implements BaseAIConnector {
  readonly id = 'OPENAI' as const
  readonly capabilities = [
    'READ_TOKEN_USAGE',
    'READ_SEAT_ASSIGNMENTS',
    'READ_BILLING_EXPORT',
  ] as const

  private readonly mode: ConnectorMode

  constructor(mode: ConnectorMode = 'MOCK_CONNECTOR') {
    this.mode = mode
  }

  async runSync(tenantId: string): Promise<AIConnectorSyncResult> {
    if (this.mode === 'LIVE') {
      throw new Error(
        'OpenAIConnector LIVE mode is not implemented. Configure an API key and implement the /v1/usage endpoint call.',
      )
    }

    // MOCK_CONNECTOR: return deterministic data
    return {
      connectorId: 'OPENAI',
      tenantId,
      syncedAt: new Date('2026-05-21T08:00:00.000Z').toISOString(),
      usageRecords: buildOpenAIUsageRecords(tenantId),
      seatRecords: OPENAI_SEATS,
      health: 'HEALTHY',
    }
  }

  async checkHealth(_tenantId: string): Promise<'HEALTHY' | 'DEGRADED' | 'FAILED'> {
    if (this.mode === 'MOCK_CONNECTOR') {
      return 'HEALTHY'
    }
    // LIVE: would call GET https://api.openai.com/v1/models to validate credentials
    throw new Error('OpenAIConnector LIVE health check is not implemented.')
  }
}

export const openAIConnector = new OpenAIConnector('MOCK_CONNECTOR')
export { OpenAIConnector }
