// Anthropic connector for Claude API usage telemetry
// Supports: READ_TOKEN_USAGE, READ_SEAT_ASSIGNMENTS, READ_BILLING_EXPORT, READ_AGENT_ACTIVITY
// In LIVE mode, would call:
//   GET https://api.anthropic.com/v1/usage
//   GET https://api.anthropic.com/v1/organizations/members

import type {
  AIConnectorId,
  AIConnectorSyncResult,
  AIVendorSeatRecord,
  BaseAIConnector,
  ConnectorMode,
  NormalizedAIUsageRecord,
} from './ai-connector-types.js'

function mockDate(daysAgo: number): string {
  const ref = new Date('2026-05-21T00:00:00.000Z')
  ref.setUTCDate(ref.getUTCDate() - daysAgo)
  return ref.toISOString().slice(0, 10)
}

const ANTHROPIC_SEATS: AIVendorSeatRecord[] = [
  {
    userId: 'usr_ant_001',
    email: 'alice@acme.com',
    assignedAt: '2025-10-01',
    lastActiveAt: '2026-05-20',
    lastActiveDaysAgo: 1,
    isIdle: false,
    plan: 'enterprise',
    costPerSeatPerMonth: 40,
  },
  {
    userId: 'usr_ant_002',
    email: 'bob@acme.com',
    assignedAt: '2025-10-01',
    lastActiveAt: '2026-05-15',
    lastActiveDaysAgo: 6,
    isIdle: false,
    plan: 'enterprise',
    costPerSeatPerMonth: 40,
  },
  {
    userId: 'usr_ant_003',
    email: 'carol@acme.com',
    assignedAt: '2025-12-01',
    lastActiveAt: '2026-02-14',
    lastActiveDaysAgo: 96,
    isIdle: true,
    plan: 'enterprise',
    costPerSeatPerMonth: 40,
  },
  {
    userId: 'usr_ant_004',
    email: 'dan@acme.com',
    assignedAt: '2026-01-15',
    lastActiveAt: '2026-01-20',
    lastActiveDaysAgo: 121,
    isIdle: true,
    plan: 'enterprise',
    costPerSeatPerMonth: 40,
  },
  {
    userId: 'usr_ant_005',
    email: 'eve@acme.com',
    assignedAt: '2026-03-01',
    lastActiveAt: '2026-05-19',
    lastActiveDaysAgo: 2,
    isIdle: false,
    plan: 'enterprise',
    costPerSeatPerMonth: 40,
  },
]

function buildAnthropicUsageRecords(tenantId: string): NormalizedAIUsageRecord[] {
  const records: NormalizedAIUsageRecord[] = []

  // Claude Opus 4.7: high-complexity reasoning tasks, expensive
  // $15/1M input, $75/1M output
  const opusBase = [
    { day: 1, inputTokens: 280_000, outputTokens: 95_000, requests: 180, agents: 60,  humans: 120 },
    { day: 2, inputTokens: 310_000, outputTokens: 105_000, requests: 200, agents: 70,  humans: 130 },
    { day: 3, inputTokens: 260_000, outputTokens: 88_000, requests: 165, agents: 55,  humans: 110 },
    { day: 4, inputTokens: 330_000, outputTokens: 112_000, requests: 215, agents: 75,  humans: 140 },
    { day: 5, inputTokens: 295_000, outputTokens: 100_000, requests: 190, agents: 65,  humans: 125 },
    { day: 6, inputTokens: 240_000, outputTokens: 82_000, requests: 155, agents: 50,  humans: 105 },
    { day: 7, inputTokens: 225_000, outputTokens: 78_000, requests: 145, agents: 48,  humans: 97  },
  ]

  for (const row of opusBase) {
    const costUSD = (row.inputTokens / 1_000_000) * 15 + (row.outputTokens / 1_000_000) * 75
    records.push({
      tenantId,
      connectorId: 'ANTHROPIC' as AIConnectorId,
      recordDate: mockDate(row.day),
      modelId: 'claude-opus-4-7',
      vendor: 'Anthropic',
      totalInputTokens: row.inputTokens,
      totalOutputTokens: row.outputTokens,
      totalRequests: row.requests,
      totalCostUSD: Math.round(costUSD * 100) / 100,
      activeSeats: 3,
      totalSeats: ANTHROPIC_SEATS.length,
      idleSeats: ANTHROPIC_SEATS.filter((s) => s.isIdle).length,
      agentActivityCount: row.agents,
      humanActivityCount: row.humans,
      averageContextTokens: Math.round(row.inputTokens / row.requests),
      averageOutputTokens: Math.round(row.outputTokens / row.requests),
      retryCount: Math.round(row.requests * 0.025),
      errorCount: Math.round(row.requests * 0.008),
      environment: 'production',
    })
  }

  // Claude Sonnet 4.6: balanced model, moderate cost
  // $3/1M input, $15/1M output
  const sonnetBase = [
    { day: 1, inputTokens: 1_400_000, outputTokens: 420_000, requests: 2_200, agents: 1_100, humans: 1_100 },
    { day: 2, inputTokens: 1_550_000, outputTokens: 460_000, requests: 2_450, agents: 1_230, humans: 1_220 },
    { day: 3, inputTokens: 1_300_000, outputTokens: 390_000, requests: 2_050, agents: 1_025, humans: 1_025 },
    { day: 4, inputTokens: 1_620_000, outputTokens: 490_000, requests: 2_550, agents: 1_280, humans: 1_270 },
    { day: 5, inputTokens: 1_480_000, outputTokens: 445_000, requests: 2_340, agents: 1_170, humans: 1_170 },
    { day: 6, inputTokens: 1_200_000, outputTokens: 360_000, requests: 1_900, agents: 950,  humans: 950  },
    { day: 7, inputTokens: 1_150_000, outputTokens: 345_000, requests: 1_820, agents: 910,  humans: 910  },
  ]

  for (const row of sonnetBase) {
    const costUSD = (row.inputTokens / 1_000_000) * 3 + (row.outputTokens / 1_000_000) * 15
    records.push({
      tenantId,
      connectorId: 'ANTHROPIC' as AIConnectorId,
      recordDate: mockDate(row.day),
      modelId: 'claude-sonnet-4-6',
      vendor: 'Anthropic',
      totalInputTokens: row.inputTokens,
      totalOutputTokens: row.outputTokens,
      totalRequests: row.requests,
      totalCostUSD: Math.round(costUSD * 100) / 100,
      activeSeats: 3,
      totalSeats: ANTHROPIC_SEATS.length,
      idleSeats: ANTHROPIC_SEATS.filter((s) => s.isIdle).length,
      agentActivityCount: row.agents,
      humanActivityCount: row.humans,
      averageContextTokens: Math.round(row.inputTokens / row.requests),
      averageOutputTokens: Math.round(row.outputTokens / row.requests),
      retryCount: Math.round(row.requests * 0.02),
      errorCount: Math.round(row.requests * 0.006),
      environment: 'production',
    })
  }

  // Claude Haiku 4.5: lightweight tasks, low cost
  // $0.80/1M input, $4/1M output
  const haikuBase = [
    { day: 1, inputTokens: 5_500_000, outputTokens: 1_100_000, requests: 12_000, agents: 9_600, humans: 2_400 },
    { day: 2, inputTokens: 5_900_000, outputTokens: 1_180_000, requests: 12_800, agents: 10_240, humans: 2_560 },
    { day: 3, inputTokens: 5_200_000, outputTokens: 1_040_000, requests: 11_400, agents: 9_120, humans: 2_280 },
    { day: 4, inputTokens: 6_100_000, outputTokens: 1_220_000, requests: 13_300, agents: 10_640, humans: 2_660 },
    { day: 5, inputTokens: 5_700_000, outputTokens: 1_140_000, requests: 12_450, agents: 9_960, humans: 2_490 },
    { day: 6, inputTokens: 4_900_000, outputTokens: 980_000,  requests: 10_700, agents: 8_560, humans: 2_140 },
    { day: 7, inputTokens: 4_700_000, outputTokens: 940_000,  requests: 10_300, agents: 8_240, humans: 2_060 },
  ]

  for (const row of haikuBase) {
    const costUSD = (row.inputTokens / 1_000_000) * 0.8 + (row.outputTokens / 1_000_000) * 4
    records.push({
      tenantId,
      connectorId: 'ANTHROPIC' as AIConnectorId,
      recordDate: mockDate(row.day),
      modelId: 'claude-haiku-4-5',
      vendor: 'Anthropic',
      totalInputTokens: row.inputTokens,
      totalOutputTokens: row.outputTokens,
      totalRequests: row.requests,
      totalCostUSD: Math.round(costUSD * 100) / 100,
      activeSeats: 3,
      totalSeats: ANTHROPIC_SEATS.length,
      idleSeats: ANTHROPIC_SEATS.filter((s) => s.isIdle).length,
      agentActivityCount: row.agents,
      humanActivityCount: row.humans,
      averageContextTokens: Math.round(row.inputTokens / row.requests),
      averageOutputTokens: Math.round(row.outputTokens / row.requests),
      retryCount: Math.round(row.requests * 0.015),
      errorCount: Math.round(row.requests * 0.004),
      environment: 'production',
    })
  }

  return records
}

class AnthropicConnector implements BaseAIConnector {
  readonly id = 'ANTHROPIC' as const
  readonly capabilities = [
    'READ_TOKEN_USAGE',
    'READ_SEAT_ASSIGNMENTS',
    'READ_BILLING_EXPORT',
    'READ_AGENT_ACTIVITY',
  ] as const

  private readonly mode: ConnectorMode

  constructor(mode: ConnectorMode = 'MOCK_CONNECTOR') {
    this.mode = mode
  }

  async runSync(tenantId: string): Promise<AIConnectorSyncResult> {
    if (this.mode === 'LIVE') {
      throw new Error(
        'AnthropicConnector LIVE mode is not implemented. Configure an API key and implement the usage endpoint call.',
      )
    }
    return {
      connectorId: 'ANTHROPIC',
      tenantId,
      syncedAt: new Date('2026-05-21T08:05:00.000Z').toISOString(),
      usageRecords: buildAnthropicUsageRecords(tenantId),
      seatRecords: ANTHROPIC_SEATS,
      health: 'HEALTHY',
    }
  }

  async checkHealth(_tenantId: string): Promise<'HEALTHY' | 'DEGRADED' | 'FAILED'> {
    if (this.mode === 'MOCK_CONNECTOR') return 'HEALTHY'
    throw new Error('AnthropicConnector LIVE health check is not implemented.')
  }
}

export const anthropicConnector = new AnthropicConnector('MOCK_CONNECTOR')
export { AnthropicConnector }
