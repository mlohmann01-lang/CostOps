/**
 * AI Cost Breakdown
 *
 * Provides dimensional cost attribution by grouping NormalizedCostRecords
 * along a single CostDimension and computing per-group aggregates.
 */

// Dimension types for cost attribution
type CostDimension =
  | 'PROVIDER'
  | 'MODEL'
  | 'USER'
  | 'WORKFLOW'
  | 'AGENT'
  | 'TOOL'
  | 'BUSINESS_UNIT'
  | 'OUTCOME'

type CostBreakdownEntry = {
  dimensionType: CostDimension
  dimensionKey: string // e.g. 'OPENAI', 'gpt-4o', 'user@example.com', 'workflow-abc'
  periodStart: string // ISO date
  periodEnd: string // ISO date
  totalCostUSD: number
  inputTokens: number
  outputTokens: number
  requestCount: number
  avgCostPerRequestUSD: number
  percentageOfTotal: number // 0–100
}

type CostBreakdownReport = {
  tenantId: string
  periodStart: string
  periodEnd: string
  totalCostUSD: number
  breakdowns: CostBreakdownEntry[]
  generatedAt: string
}

// NormalizedCostRecord — minimal record used inside the engine
type NormalizedCostRecord = {
  connectorId: string
  modelId: string | null
  userId: string | null
  workflowId: string | null
  agentId: string | null
  toolId: string | null
  businessUnit: string | null
  outcomeId: string | null
  inputTokens: number
  outputTokens: number
  costUSD: number
}

function getDimensionKey(record: NormalizedCostRecord, dimension: CostDimension): string {
  switch (dimension) {
    case 'PROVIDER':
      return record.connectorId
    case 'MODEL':
      return record.modelId ?? 'unknown'
    case 'USER':
      return record.userId ?? 'anonymous'
    case 'WORKFLOW':
      return record.workflowId ?? 'unattributed'
    case 'AGENT':
      return record.agentId ?? 'unattributed'
    case 'TOOL':
      return record.toolId ?? 'unattributed'
    case 'BUSINESS_UNIT':
      return record.businessUnit ?? 'unattributed'
    case 'OUTCOME':
      return record.outcomeId ?? 'no-outcome'
  }
}

type GroupAccumulator = {
  totalCostUSD: number
  inputTokens: number
  outputTokens: number
  requestCount: number
}

// Build a breakdown along a single dimension from usage records
function buildCostBreakdown(
  tenantId: string,
  records: NormalizedCostRecord[],
  dimension: CostDimension,
  periodStart: string,
  periodEnd: string,
): CostBreakdownReport {
  // Aggregate records by dimension key
  const groups = new Map<string, GroupAccumulator>()

  for (const record of records) {
    const key = getDimensionKey(record, dimension)
    const existing = groups.get(key)
    if (existing !== undefined) {
      existing.totalCostUSD += record.costUSD
      existing.inputTokens += record.inputTokens
      existing.outputTokens += record.outputTokens
      existing.requestCount += 1
    } else {
      groups.set(key, {
        totalCostUSD: record.costUSD,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        requestCount: 1,
      })
    }
  }

  // Compute report-level total
  const totalCostUSD = records.reduce((sum, r) => sum + r.costUSD, 0)

  // Build breakdown entries
  const breakdowns: CostBreakdownEntry[] = []
  for (const [dimensionKey, agg] of groups) {
    const percentageOfTotal =
      totalCostUSD > 0 ? (agg.totalCostUSD / totalCostUSD) * 100 : 0

    const avgCostPerRequestUSD =
      agg.requestCount > 0 ? agg.totalCostUSD / agg.requestCount : 0

    breakdowns.push({
      dimensionType: dimension,
      dimensionKey,
      periodStart,
      periodEnd,
      totalCostUSD: agg.totalCostUSD,
      inputTokens: agg.inputTokens,
      outputTokens: agg.outputTokens,
      requestCount: agg.requestCount,
      avgCostPerRequestUSD,
      percentageOfTotal,
    })
  }

  // Sort descending by cost for readability
  breakdowns.sort((a, b) => b.totalCostUSD - a.totalCostUSD)

  return {
    tenantId,
    periodStart,
    periodEnd,
    totalCostUSD,
    breakdowns,
    generatedAt: new Date().toISOString(),
  }
}

export type { CostDimension, CostBreakdownEntry, CostBreakdownReport, NormalizedCostRecord }
export { buildCostBreakdown }
