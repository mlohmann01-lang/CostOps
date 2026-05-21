// Windsurf IDE connector for seat and workspace usage telemetry
// Supports: READ_SEAT_ASSIGNMENTS, READ_WORKSPACE_ACTIVITY
// Seat-based billing model, similar to Cursor. Competitive overlap with Cursor.

import type {
  AIConnectorId,
  AIConnectorSyncResult,
  AIVendorSeatRecord,
  BaseAIConnector,
  ConnectorMode,
  NormalizedAIUsageRecord,
} from './ai-connector-types.js'

// Note: several users have BOTH Cursor and Windsurf seats — classic overlap scenario
const WINDSURF_SEATS: AIVendorSeatRecord[] = [
  { userId: 'usr_wf_001', email: 'alice@acme.com',   assignedAt: '2026-01-01', lastActiveAt: '2026-04-10', lastActiveDaysAgo: 41,  isIdle: true,  plan: 'pro', costPerSeatPerMonth: 30 },
  { userId: 'usr_wf_002', email: 'bob@acme.com',     assignedAt: '2026-01-01', lastActiveAt: '2026-03-15', lastActiveDaysAgo: 67,  isIdle: true,  plan: 'pro', costPerSeatPerMonth: 30 },
  { userId: 'usr_wf_003', email: 'carol@acme.com',   assignedAt: '2026-01-15', lastActiveAt: '2026-05-05', lastActiveDaysAgo: 16,  isIdle: false, plan: 'pro', costPerSeatPerMonth: 30 },
  { userId: 'usr_wf_004', email: 'dan@acme.com',     assignedAt: '2026-01-15', lastActiveAt: '2026-01-20', lastActiveDaysAgo: 121, isIdle: true,  plan: 'pro', costPerSeatPerMonth: 30 },
  { userId: 'usr_wf_005', email: 'new_hire1@acme.com', assignedAt: '2026-04-01', lastActiveAt: '2026-05-19', lastActiveDaysAgo: 2,  isIdle: false, plan: 'pro', costPerSeatPerMonth: 30 },
  { userId: 'usr_wf_006', email: 'new_hire2@acme.com', assignedAt: '2026-04-15', lastActiveAt: '2026-05-20', lastActiveDaysAgo: 1,  isIdle: false, plan: 'pro', costPerSeatPerMonth: 30 },
  { userId: 'usr_wf_007', email: 'new_hire3@acme.com', assignedAt: '2026-05-01', lastActiveAt: '2026-05-18', lastActiveDaysAgo: 3,  isIdle: false, plan: 'pro', costPerSeatPerMonth: 30 },
  { userId: 'usr_wf_008', email: 'grace@acme.com',   assignedAt: '2026-02-01', lastActiveAt: '2026-02-28', lastActiveDaysAgo: 82,  isIdle: true,  plan: 'pro', costPerSeatPerMonth: 30 },
]

// Users with BOTH Cursor and Windsurf (overlap detection target)
export const WINDSURF_CURSOR_OVERLAP_EMAILS = ['alice@acme.com', 'bob@acme.com', 'carol@acme.com', 'dan@acme.com', 'grace@acme.com']

function buildWindsurfUsageRecords(tenantId: string): NormalizedAIUsageRecord[] {
  const activeSeats = WINDSURF_SEATS.filter((s) => !s.isIdle).length
  const idleSeats = WINDSURF_SEATS.filter((s) => s.isIdle).length

  const dailyActivity = [
    { day: 1, completions: 480,  codeEditRequests: 145, chatMessages: 88 },
    { day: 2, completions: 510,  codeEditRequests: 158, chatMessages: 94 },
    { day: 3, completions: 445,  codeEditRequests: 132, chatMessages: 80 },
    { day: 4, completions: 535,  codeEditRequests: 162, chatMessages: 98 },
    { day: 5, completions: 498,  codeEditRequests: 150, chatMessages: 90 },
    { day: 6, completions: 410,  codeEditRequests: 122, chatMessages: 72 },
    { day: 7, completions: 390,  codeEditRequests: 116, chatMessages: 68 },
  ]

  function mockDate(daysAgo: number): string {
    const ref = new Date('2026-05-21T00:00:00.000Z')
    ref.setUTCDate(ref.getUTCDate() - daysAgo)
    return ref.toISOString().slice(0, 10)
  }

  return dailyActivity.map((row) => {
    const totalRequests = row.completions + row.codeEditRequests + row.chatMessages
    const estimatedInput = row.completions * 200 + row.codeEditRequests * 800 + row.chatMessages * 1200
    const estimatedOutput = row.completions * 80 + row.codeEditRequests * 400 + row.chatMessages * 600
    const dailyProRata = (WINDSURF_SEATS.length * 30) / 30
    return {
      tenantId,
      connectorId: 'WINDSURF' as AIConnectorId,
      recordDate: mockDate(row.day),
      modelId: 'windsurf-mixed',
      vendor: 'Windsurf',
      totalInputTokens: estimatedInput,
      totalOutputTokens: estimatedOutput,
      totalRequests,
      totalCostUSD: Math.round(dailyProRata * 100) / 100,
      activeSeats,
      totalSeats: WINDSURF_SEATS.length,
      idleSeats,
      agentActivityCount: row.completions,
      humanActivityCount: row.codeEditRequests + row.chatMessages,
      averageContextTokens: Math.round(estimatedInput / totalRequests),
      averageOutputTokens: Math.round(estimatedOutput / totalRequests),
      retryCount: 0,
      errorCount: 0,
      environment: 'production',
    }
  })
}

class WindsurfConnector implements BaseAIConnector {
  readonly id = 'WINDSURF' as const
  readonly capabilities = ['READ_SEAT_ASSIGNMENTS', 'READ_WORKSPACE_ACTIVITY'] as const

  private readonly mode: ConnectorMode

  constructor(mode: ConnectorMode = 'MOCK_CONNECTOR') {
    this.mode = mode
  }

  async runSync(tenantId: string): Promise<AIConnectorSyncResult> {
    if (this.mode === 'LIVE') {
      throw new Error('WindsurfConnector LIVE mode is not implemented.')
    }
    return {
      connectorId: 'WINDSURF',
      tenantId,
      syncedAt: new Date('2026-05-21T08:15:00.000Z').toISOString(),
      usageRecords: buildWindsurfUsageRecords(tenantId),
      seatRecords: WINDSURF_SEATS,
      health: 'HEALTHY',
    }
  }

  async checkHealth(_tenantId: string): Promise<'HEALTHY' | 'DEGRADED' | 'FAILED'> {
    if (this.mode === 'MOCK_CONNECTOR') return 'HEALTHY'
    throw new Error('WindsurfConnector LIVE health check is not implemented.')
  }
}

export const windsurfConnector = new WindsurfConnector('MOCK_CONNECTOR')
export { WindsurfConnector }
