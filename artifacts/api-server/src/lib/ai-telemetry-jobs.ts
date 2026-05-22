// AI Telemetry Sync Jobs
// Extends the existing job framework with AI-specific telemetry sync operations.
// Each job handler follows the same try/catch + timing pattern used throughout
// the job framework (see jobs/job-registry.ts and jobs/job-runner.ts).
//
// Integration: these handlers are dispatched via dispatchAITelemetryJob().
// To wire into the main scheduler, add AI_TELEMETRY_JOB_TYPES entries to
// JOB_HANDLERS in jobs/job-registry.ts and JobType in jobs/job-types.ts.

import { openAIConnector } from './connectors/ai/openai-connector.js'
import { anthropicConnector } from './connectors/ai/anthropic-connector.js'
import { cursorConnector } from './connectors/ai/cursor-connector.js'
import {
  windsurfConnector,
  WINDSURF_CURSOR_OVERLAP_EMAILS,
} from './connectors/ai/windsurf-connector.js'

// ---------------------------------------------------------------------------
// Job type registry
// ---------------------------------------------------------------------------

export const AI_TELEMETRY_JOB_TYPES = [
  'AI_USAGE_SYNC',
  'AI_BILLING_SYNC',
  'AI_SEAT_SYNC',
  'AI_AGENT_RUNTIME_SYNC',
  'AI_CONTEXT_USAGE_SYNC',
  'AI_EMBEDDING_USAGE_SYNC',
  'AI_VENDOR_OVERLAP_SCAN',
  'AI_DRIFT_SCAN',
  'AI_ROI_RECONCILIATION',
] as const

export type AITelemetryJobType = (typeof AI_TELEMETRY_JOB_TYPES)[number]

// ---------------------------------------------------------------------------
// Context and result types
// ---------------------------------------------------------------------------

export type AITelemetryJobContext = {
  tenantId: string
  jobType: AITelemetryJobType
  triggeredAt: string
  options: Record<string, unknown>
}

export type AITelemetryJobResult = {
  tenantId: string
  jobType: AITelemetryJobType
  success: boolean
  recordsProcessed: number
  durationMs: number
  completedAt: string
  error: string | null
}

// ---------------------------------------------------------------------------
// Helper: build a successful result
// ---------------------------------------------------------------------------

function makeResult(
  ctx: AITelemetryJobContext,
  recordsProcessed: number,
  durationMs: number,
): AITelemetryJobResult {
  return {
    tenantId: ctx.tenantId,
    jobType: ctx.jobType,
    success: true,
    recordsProcessed,
    durationMs,
    completedAt: new Date().toISOString(),
    error: null,
  }
}

function makeError(
  ctx: AITelemetryJobContext,
  err: unknown,
  durationMs: number,
): AITelemetryJobResult {
  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'UNKNOWN_ERROR'
  return {
    tenantId: ctx.tenantId,
    jobType: ctx.jobType,
    success: false,
    recordsProcessed: 0,
    durationMs,
    completedAt: new Date().toISOString(),
    error: message,
  }
}

// ---------------------------------------------------------------------------
// Job handlers
// ---------------------------------------------------------------------------

/**
 * AI_USAGE_SYNC
 * Syncs token usage records from OpenAI and Anthropic connectors.
 * Returns the combined record count from both vendors.
 */
export async function runAIUsageSync(ctx: AITelemetryJobContext): Promise<AITelemetryJobResult> {
  const startTime = Date.now()
  try {
    const [openAIResult, anthropicResult] = await Promise.all([
      openAIConnector.runSync(ctx.tenantId),
      anthropicConnector.runSync(ctx.tenantId),
    ])
    const recordsProcessed =
      openAIResult.usageRecords.length + anthropicResult.usageRecords.length
    return makeResult(ctx, recordsProcessed, Date.now() - startTime)
  } catch (err) {
    return makeError(ctx, err, Date.now() - startTime)
  }
}

/**
 * AI_BILLING_SYNC
 * Syncs billing export data from OpenAI connector.
 * Counts usage records carrying cost information as billing records.
 */
export async function runAIBillingSync(ctx: AITelemetryJobContext): Promise<AITelemetryJobResult> {
  const startTime = Date.now()
  try {
    const result = await openAIConnector.runSync(ctx.tenantId)
    // Billing data lives in usage records — each record has a totalCostUSD field
    const billingRecords = result.usageRecords.filter((r) => r.totalCostUSD > 0)
    return makeResult(ctx, billingRecords.length, Date.now() - startTime)
  } catch (err) {
    return makeError(ctx, err, Date.now() - startTime)
  }
}

/**
 * AI_SEAT_SYNC
 * Syncs seat assignment records from Cursor and Windsurf connectors.
 * Returns the combined seat record count.
 */
export async function runAISeatSync(ctx: AITelemetryJobContext): Promise<AITelemetryJobResult> {
  const startTime = Date.now()
  try {
    const [cursorResult, windsurfResult] = await Promise.all([
      cursorConnector.runSync(ctx.tenantId),
      windsurfConnector.runSync(ctx.tenantId),
    ])
    const recordsProcessed =
      cursorResult.seatRecords.length + windsurfResult.seatRecords.length
    return makeResult(ctx, recordsProcessed, Date.now() - startTime)
  } catch (err) {
    return makeError(ctx, err, Date.now() - startTime)
  }
}

/**
 * AI_AGENT_RUNTIME_SYNC
 * Stub: no dedicated agent runtime connector exists yet.
 * Will be implemented once an agent activity connector is available.
 */
export async function runAIAgentRuntimeSync(
  ctx: AITelemetryJobContext,
): Promise<AITelemetryJobResult> {
  const startTime = Date.now()
  try {
    // Stub — agent connector not yet implemented
    return makeResult(ctx, 0, Date.now() - startTime)
  } catch (err) {
    return makeError(ctx, err, Date.now() - startTime)
  }
}

/**
 * AI_CONTEXT_USAGE_SYNC
 * Stub: context window utilisation metrics require a dedicated aggregation
 * pipeline that is not yet wired up.
 */
export async function runAIContextUsageSync(
  ctx: AITelemetryJobContext,
): Promise<AITelemetryJobResult> {
  const startTime = Date.now()
  try {
    // Stub — context usage aggregation not yet implemented
    return makeResult(ctx, 0, Date.now() - startTime)
  } catch (err) {
    return makeError(ctx, err, Date.now() - startTime)
  }
}

/**
 * AI_EMBEDDING_USAGE_SYNC
 * Stub: embedding API usage tracking is not yet wired to a connector.
 */
export async function runAIEmbeddingUsageSync(
  ctx: AITelemetryJobContext,
): Promise<AITelemetryJobResult> {
  const startTime = Date.now()
  try {
    // Stub — embedding usage connector not yet implemented
    return makeResult(ctx, 0, Date.now() - startTime)
  } catch (err) {
    return makeError(ctx, err, Date.now() - startTime)
  }
}

/**
 * AI_VENDOR_OVERLAP_SCAN
 * Detects users holding seats across both Cursor and Windsurf.
 * Uses the pre-computed WINDSURF_CURSOR_OVERLAP_EMAILS list from the
 * Windsurf connector. Returns overlap count as recordsProcessed.
 */
export async function runAIVendorOverlapScan(
  ctx: AITelemetryJobContext,
): Promise<AITelemetryJobResult> {
  const startTime = Date.now()
  try {
    const overlapCount = WINDSURF_CURSOR_OVERLAP_EMAILS.length
    return makeResult(ctx, overlapCount, Date.now() - startTime)
  } catch (err) {
    return makeError(ctx, err, Date.now() - startTime)
  }
}

/**
 * AI_DRIFT_SCAN
 * Stub: drift detection for AI seat and usage runs from operationalization
 * packs (see FLEXERA_VALUE_PACK_RUN / SERVICENOW_SAM_PACK_RUN patterns).
 * No standalone AI drift engine is wired yet.
 */
export async function runAIDriftScan(ctx: AITelemetryJobContext): Promise<AITelemetryJobResult> {
  const startTime = Date.now()
  try {
    // Stub — drift detection runs from packs, not this job directly
    return makeResult(ctx, 0, Date.now() - startTime)
  } catch (err) {
    return makeError(ctx, err, Date.now() - startTime)
  }
}

/**
 * AI_ROI_RECONCILIATION
 * Stub: ROI reconciliation requires a cost-savings ledger that is not yet
 * populated for AI vendors.
 */
export async function runAIROIReconciliation(
  ctx: AITelemetryJobContext,
): Promise<AITelemetryJobResult> {
  const startTime = Date.now()
  try {
    // Stub — ROI reconciliation not yet implemented for AI vendors
    return makeResult(ctx, 0, Date.now() - startTime)
  } catch (err) {
    return makeError(ctx, err, Date.now() - startTime)
  }
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatch an AI telemetry job to the appropriate handler by jobType.
 * Returns a structured result whether the job succeeds or fails.
 */
export async function dispatchAITelemetryJob(
  ctx: AITelemetryJobContext,
): Promise<AITelemetryJobResult> {
  switch (ctx.jobType) {
    case 'AI_USAGE_SYNC':
      return runAIUsageSync(ctx)
    case 'AI_BILLING_SYNC':
      return runAIBillingSync(ctx)
    case 'AI_SEAT_SYNC':
      return runAISeatSync(ctx)
    case 'AI_AGENT_RUNTIME_SYNC':
      return runAIAgentRuntimeSync(ctx)
    case 'AI_CONTEXT_USAGE_SYNC':
      return runAIContextUsageSync(ctx)
    case 'AI_EMBEDDING_USAGE_SYNC':
      return runAIEmbeddingUsageSync(ctx)
    case 'AI_VENDOR_OVERLAP_SCAN':
      return runAIVendorOverlapScan(ctx)
    case 'AI_DRIFT_SCAN':
      return runAIDriftScan(ctx)
    case 'AI_ROI_RECONCILIATION':
      return runAIROIReconciliation(ctx)
    default: {
      // Exhaustiveness check: TypeScript will error here if a new job type is
      // added to AI_TELEMETRY_JOB_TYPES without a corresponding case.
      const _exhaustive: never = ctx.jobType
      return {
        tenantId: ctx.tenantId,
        jobType: _exhaustive,
        success: false,
        recordsProcessed: 0,
        durationMs: 0,
        completedAt: new Date().toISOString(),
        error: 'UNKNOWN_JOB_TYPE',
      }
    }
  }
}
