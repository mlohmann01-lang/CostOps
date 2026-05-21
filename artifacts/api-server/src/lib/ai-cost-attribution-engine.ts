/**
 * AI Cost Attribution Engine
 *
 * Orchestrates multi-dimensional cost attribution by combining breakdown
 * reports across PROVIDER, MODEL, USER, WORKFLOW, and AGENT dimensions
 * with a confidence assessment for the overall estimate.
 */

import type { NormalizedCostRecord, CostBreakdownReport } from './ai-cost-breakdown.js'
import type { CostConfidenceResult, CostConfidenceFactors } from './ai-cost-confidence.js'
import { buildCostBreakdown } from './ai-cost-breakdown.js'
import { computeCostConfidence } from './ai-cost-confidence.js'

type AIAttributionReport = {
  tenantId: string
  periodStart: string
  periodEnd: string
  totalCostUSD: number
  byProvider: CostBreakdownReport
  byModel: CostBreakdownReport
  byUser: CostBreakdownReport
  byWorkflow: CostBreakdownReport
  byAgent: CostBreakdownReport
  confidence: CostConfidenceResult
  generatedAt: string
}

function computeAttributionReport(
  tenantId: string,
  records: NormalizedCostRecord[],
  periodStart: string,
  periodEnd: string,
  confidenceFactors: CostConfidenceFactors,
): AIAttributionReport {
  const totalCostUSD = records.reduce((sum, r) => sum + r.costUSD, 0)

  const byProvider = buildCostBreakdown(tenantId, records, 'PROVIDER', periodStart, periodEnd)
  const byModel = buildCostBreakdown(tenantId, records, 'MODEL', periodStart, periodEnd)
  const byUser = buildCostBreakdown(tenantId, records, 'USER', periodStart, periodEnd)
  const byWorkflow = buildCostBreakdown(tenantId, records, 'WORKFLOW', periodStart, periodEnd)
  const byAgent = buildCostBreakdown(tenantId, records, 'AGENT', periodStart, periodEnd)

  const confidence = computeCostConfidence(confidenceFactors)

  return {
    tenantId,
    periodStart,
    periodEnd,
    totalCostUSD,
    byProvider,
    byModel,
    byUser,
    byWorkflow,
    byAgent,
    confidence,
    generatedAt: new Date().toISOString(),
  }
}

// Structural shape of telemetry events accepted by this adapter.
// Mirrors NormalizedAITelemetryEvent fields used here without importing
// from ai-telemetry-types.ts to avoid circular dependencies.
type TelemetryEventShape = {
  connectorId: string
  modelId: string | null
  userId: string | null
  workflowId: string | null
  agentId: string | null
  inputTokens: number
  outputTokens: number
  costUSD: number
}

// Convenience: build NormalizedCostRecords from telemetry event objects.
// Fields not present on telemetry events (toolId, businessUnit, outcomeId)
// are set to null.
function telemetryEventsToAttributionRecords(
  events: Array<TelemetryEventShape>,
): NormalizedCostRecord[] {
  return events.map((event) => ({
    connectorId: event.connectorId,
    modelId: event.modelId,
    userId: event.userId,
    workflowId: event.workflowId,
    agentId: event.agentId,
    toolId: null,
    businessUnit: null,
    outcomeId: null,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    costUSD: event.costUSD,
  }))
}

export type { AIAttributionReport }
export { computeAttributionReport, telemetryEventsToAttributionRecords }
