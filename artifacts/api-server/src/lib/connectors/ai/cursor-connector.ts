// Cursor IDE connector for seat and workspace usage telemetry
// Supports: READ_SEAT_ASSIGNMENTS, READ_WORKSPACE_ACTIVITY
// Seat-based billing — not token-based. Cursor bills per developer seat.

import type {
  AIConnectorId,
  AIConnectorSyncResult,
  AIVendorSeatRecord,
  BaseAIConnector,
  ConnectorMode,
  NormalizedAIUsageRecord,
} from './ai-connector-types.js'

const CURSOR_SEATS: AIVendorSeatRecord[] = [
  { userId: 'usr_cursor_001', email: 'alice@acme.com',   assignedAt: '2025-09-01', lastActiveAt: '2026-05-20', lastActiveDaysAgo: 1,   isIdle: false, plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_002', email: 'bob@acme.com',     assignedAt: '2025-09-01', lastActiveAt: '2026-05-18', lastActiveDaysAgo: 3,   isIdle: false, plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_003', email: 'carol@acme.com',   assignedAt: '2025-09-01', lastActiveAt: '2026-05-21', lastActiveDaysAgo: 0,   isIdle: false, plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_004', email: 'dan@acme.com',     assignedAt: '2025-10-15', lastActiveAt: '2026-03-01', lastActiveDaysAgo: 81,  isIdle: true,  plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_005', email: 'eve@acme.com',     assignedAt: '2025-11-01', lastActiveAt: '2026-02-10', lastActiveDaysAgo: 100, isIdle: true,  plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_006', email: 'frank@acme.com',   assignedAt: '2026-01-01', lastActiveAt: '2026-04-15', lastActiveDaysAgo: 36,  isIdle: true,  plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_007', email: 'grace@acme.com',   assignedAt: '2026-01-15', lastActiveAt: '2026-05-15', lastActiveDaysAgo: 6,   isIdle: false, plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_008', email: 'henry@acme.com',   assignedAt: '2026-02-01', lastActiveAt: '2026-02-05', lastActiveDaysAgo: 105, isIdle: true,  plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_009', email: 'ida@acme.com',     assignedAt: '2026-02-15', lastActiveAt: '2026-05-19', lastActiveDaysAgo: 2,   isIdle: false, plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_010', email: 'james@acme.com',   assignedAt: '2026-03-01', lastActiveAt: null,          lastActiveDaysAgo: null, isIdle: true,  plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_011', email: 'kate@acme.com',    assignedAt: '2026-03-15', lastActiveAt: '2026-05-20', lastActiveDaysAgo: 1,   isIdle: false, plan: 'business', costPerSeatPerMonth: 40 },
  { userId: 'usr_cursor_012', email: 'liam@acme.com',    assignedAt: '2026-04-01', lastActiveAt: '2026-04-03', lastActiveDaysAgo: 48,  isIdle: true,  plan: 'business', costPerSeatPerMonth: 40 },
]

function buildCursorUsageRecords(tenantId: string): NormalizedAIUsageRecord[] {
  // Cursor is seat-based: we represent daily workspace activity as usage records
  // Token counts are estimates since Cursor doesn't expose raw token usage
  const activeSeats = CURSOR_SEATS.filter((s) => !s.isIdle).length
  const idleSeats = CURSOR_SEATS.filter((s) => s.isIdle).length

  const dailyActivity = [
    { day: 1, completions: 1_240, codeEditRequests: 380, chatMessages: 210 },
    { day: 2, completions: 1_380, codeEditRequests: 420, chatMessages: 240 },
    { day: 3, completions: 1_150, codeEditRequests: 350, chatMessages: 195 },
    { day: 4, completions: 1_460, codeEditRequests: 445, chatMessages: 260 },
    { day: 5, completions: 1_310, codeEditRequests: 400, chatMessages: 225 },
    { day: 6, completions: 1_080, codeEditRequests: 325, chatMessages: 180 },
    { day: 7, completions: 1_020, codeEditRequests: 308, chatMessages: 170 },
  ]

  function mockDate(daysAgo: number): string {
    const ref = new Date('2026-05-21T00:00:00.000Z')
    ref.setUTCDate(ref.getUTCDate() - daysAgo)
    return ref.toISOString().slice(0, 10)
  }

  return dailyActivity.map((row) => {
    const totalRequests = row.completions + row.codeEditRequests + row.chatMessages
    // Estimate tokens: completions avg 200 input/80 output, edits avg 800/400, chat avg 1200/600
    const estimatedInput = row.completions * 200 + row.codeEditRequests * 800 + row.chatMessages * 1200
    const estimatedOutput = row.completions * 80 + row.codeEditRequests * 400 + row.chatMessages * 600
    // Cursor pricing is seat-based; per-request cost is implicit in seat fee
    const dailyProRata = (CURSOR_SEATS.length * 40) / 30
    return {
      tenantId,
      connectorId: 'CURSOR' as AIConnectorId,
      recordDate: mockDate(row.day),
      modelId: 'cursor-mixed',
      vendor: 'Cursor',
      totalInputTokens: estimatedInput,
      totalOutputTokens: estimatedOutput,
      totalRequests,
      totalCostUSD: Math.round(dailyProRata * 100) / 100,
      activeSeats,
      totalSeats: CURSOR_SEATS.length,
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

class CursorConnector implements BaseAIConnector {
  readonly id = 'CURSOR' as const
  readonly capabilities = ['READ_SEAT_ASSIGNMENTS', 'READ_WORKSPACE_ACTIVITY'] as const

  private readonly mode: ConnectorMode

  constructor(mode: ConnectorMode = 'MOCK_CONNECTOR') {
    this.mode = mode
  }

  async runSync(tenantId: string): Promise<AIConnectorSyncResult> {
    if (this.mode === 'LIVE') {
      throw new Error('CursorConnector LIVE mode is not implemented.')
    }
    return {
      connectorId: 'CURSOR',
      tenantId,
      syncedAt: new Date('2026-05-21T08:10:00.000Z').toISOString(),
      usageRecords: buildCursorUsageRecords(tenantId),
      seatRecords: CURSOR_SEATS,
      health: 'HEALTHY',
    }
  }

  async checkHealth(_tenantId: string): Promise<'HEALTHY' | 'DEGRADED' | 'FAILED'> {
    if (this.mode === 'MOCK_CONNECTOR') return 'HEALTHY'
    throw new Error('CursorConnector LIVE health check is not implemented.')
  }
}

export const cursorConnector = new CursorConnector('MOCK_CONNECTOR')
export { CursorConnector }
