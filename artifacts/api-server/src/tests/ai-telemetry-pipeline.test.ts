import { test } from 'node:test'
import assert from 'node:assert/strict'

import { normalizeEvent, normalizeEvents } from '../lib/ai-telemetry-normalizer.js'
import {
  computeFreshnessState,
  computeTrustLevel,
  assessConnectorFreshness,
} from '../lib/ai-telemetry-freshness.js'
import {
  buildTokenGovernanceScenario,
  buildModelRoutingScenario,
  buildVendorSeatReclaimScenario,
  buildAgentRuntimeScenario,
  buildContextGovernanceScenario,
  buildROIGovernanceScenario,
  buildDriftGovernanceScenario,
  buildOverlapEliminationScenario,
  buildMockTelemetrySnapshot,
} from '../lib/ai-mock-telemetry-fixtures.js'
import { buildCostBreakdown } from '../lib/ai-cost-breakdown.js'
import type { NormalizedCostRecord } from '../lib/ai-cost-breakdown.js'
import { computeCostConfidence } from '../lib/ai-cost-confidence.js'
import type { CostConfidenceFactors } from '../lib/ai-cost-confidence.js'
import {
  computeAttributionReport,
  telemetryEventsToAttributionRecords,
} from '../lib/ai-cost-attribution-engine.js'
import {
  hasCapability,
  listMockConnectors,
  listReadyConnectors,
  AI_CONNECTOR_CAPABILITY_REGISTRY,
} from '../lib/connectors/ai/ai-connector-capability-registry.js'
import {
  dispatchAITelemetryJob,
  AI_TELEMETRY_JOB_TYPES,
} from '../lib/ai-telemetry-jobs.js'
import type { AITelemetryJobContext } from '../lib/ai-telemetry-jobs.js'
import { buildSimulationResult } from '../lib/ai-simulation-state.js'
import type {
  AISimulationBeforeState,
  AISimulationProposedState,
} from '../lib/ai-simulation-state.js'
import {
  verifyTokenReduction,
  verifySeatReclaim,
  verifyModelRouting,
  verifyVendorConsolidation,
  verifyContextCompression,
  verifyAgentRetirement,
} from '../lib/ai-verification-strategies.js'
import {
  detectTokenSpike,
  detectModelCreep,
  detectCostSpike,
  detectUnauthorizedUsage,
  detectSeatExpansion,
  detectAgentProliferation,
  buildEvidenceHash,
} from '../lib/ai-drift-rules.js'
import {
  buildProofNode,
  buildMockProofGraph,
} from '../lib/ai-proof-graph.js'
import type { RawAITelemetryEvent } from '../lib/ai-telemetry-types.js'

// ── AI Telemetry Normalizer ────────────────────────────────────────────────

test('normalizeEvent with TOKEN_USAGE returns correct shape', () => {
  const raw: RawAITelemetryEvent = {
    eventId: 'evt-001',
    connectorId: 'OPENAI',
    eventType: 'TOKEN_USAGE',
    tenantId: 'TENANT-A',
    rawPayload: {
      modelId: 'gpt-4o',
      userId: 'user-1',
      inputTokens: 1000,
      outputTokens: 250,
      costUSD: 0.035,
    },
    collectedAt: new Date().toISOString(),
    sourceVersion: '2024-02-01',
  }
  const normalized = normalizeEvent(raw)
  assert.equal(normalized.eventId, 'norm-evt-001')
  assert.equal(normalized.modelId, 'gpt-4o')
  assert.equal(normalized.inputTokens, 1000)
  assert.equal(normalized.outputTokens, 250)
  assert.ok(normalized.costUSD > 0)
  assert.equal(normalized.seatActive, null)
  assert.equal(normalized.rawEventId, 'evt-001')
})

test('normalizeEvent with SEAT_ACTIVITY returns correct shape', () => {
  const raw: RawAITelemetryEvent = {
    eventId: 'evt-002',
    connectorId: 'CURSOR',
    eventType: 'SEAT_ACTIVITY',
    tenantId: 'TENANT-A',
    rawPayload: {
      userId: 'user-2',
      seatActive: true,
      seatLastActiveAt: '2026-05-20T10:00:00Z',
    },
    collectedAt: new Date().toISOString(),
    sourceVersion: '1.0.0',
  }
  const normalized = normalizeEvent(raw)
  assert.equal(normalized.eventId, 'norm-evt-002')
  assert.equal(normalized.inputTokens, 0)
  assert.equal(normalized.outputTokens, 0)
  assert.equal(normalized.costUSD, 0)
  assert.equal(normalized.seatActive, true)
  assert.equal(normalized.modelId, null)
})

test('normalizeEvent with EMBEDDING_USAGE extracts embeddingDimensions', () => {
  const raw: RawAITelemetryEvent = {
    eventId: 'evt-003',
    connectorId: 'OPENAI',
    eventType: 'EMBEDDING_USAGE',
    tenantId: 'TENANT-A',
    rawPayload: {
      modelId: 'text-embedding-3-small',
      userId: 'user-3',
      inputTokens: 512,
      costUSD: 0.001,
      embeddingDimensions: 1536,
    },
    collectedAt: new Date().toISOString(),
    sourceVersion: '2024-02-01',
  }
  const normalized = normalizeEvent(raw)
  assert.equal(normalized.embeddingDimensions, 1536)
  assert.equal(normalized.outputTokens, 0)
})

test('normalizeEvents batch returns ingestion result with correct counts', () => {
  const raw: RawAITelemetryEvent[] = Array.from({ length: 5 }, (_, i) => ({
    eventId: `batch-evt-${i}`,
    connectorId: 'OPENAI',
    eventType: 'TOKEN_USAGE' as const,
    tenantId: 'TENANT-B',
    rawPayload: { modelId: 'gpt-4o', inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
    collectedAt: new Date().toISOString(),
    sourceVersion: '2024-02-01',
  }))
  const result = normalizeEvents('TENANT-B', 'OPENAI', raw)
  assert.equal(result.tenantId, 'TENANT-B')
  assert.equal(result.connectorId, 'OPENAI')
  assert.equal(result.rawEventCount, 5)
  assert.equal(result.normalizedEventCount, 5)
  assert.equal(result.errorCount, 0)
  assert.equal(result.events.length, 5)
})

test('normalizeEvents skips events from wrong tenant', () => {
  const raw: RawAITelemetryEvent[] = [
    {
      eventId: 'skip-evt-0',
      connectorId: 'OPENAI',
      eventType: 'TOKEN_USAGE',
      tenantId: 'WRONG-TENANT',
      rawPayload: { modelId: 'gpt-4o', inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      collectedAt: new Date().toISOString(),
      sourceVersion: '2024-02-01',
    },
    {
      eventId: 'skip-evt-1',
      connectorId: 'OPENAI',
      eventType: 'TOKEN_USAGE',
      tenantId: 'CORRECT-TENANT',
      rawPayload: { modelId: 'gpt-4o', inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      collectedAt: new Date().toISOString(),
      sourceVersion: '2024-02-01',
    },
  ]
  const result = normalizeEvents('CORRECT-TENANT', 'OPENAI', raw)
  assert.equal(result.normalizedEventCount, 1)
  assert.equal(result.skippedEventCount, 1)
  assert.equal(result.rawEventCount, 2)
})

test('normalizeEvents with alternate field names still extracts values', () => {
  const raw: RawAITelemetryEvent[] = [
    {
      eventId: 'alt-evt-0',
      connectorId: 'OPENAI',
      eventType: 'TOKEN_USAGE',
      tenantId: 'TENANT-C',
      rawPayload: {
        model: 'gpt-4o-mini',
        user_id: 'user-alt',
        prompt_tokens: 200,
        completion_tokens: 80,
        cost_usd: 0.002,
      },
      collectedAt: new Date().toISOString(),
      sourceVersion: '2024-02-01',
    },
  ]
  const result = normalizeEvents('TENANT-C', 'OPENAI', raw)
  assert.equal(result.normalizedEventCount, 1)
  const ev = result.events[0]!
  assert.equal(ev.modelId, 'gpt-4o-mini')
  assert.equal(ev.inputTokens, 200)
})

// ── AI Telemetry Freshness ────────────────────────────────────────────────

test('computeFreshnessState returns FRESH when lastSyncAt is 1 hour ago', () => {
  const now = new Date('2026-05-21T12:00:00Z')
  const lastSync = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
  const state = computeFreshnessState(lastSync, now.toISOString(), 10)
  assert.equal(state, 'FRESH')
})

test('computeFreshnessState returns STALE when lastSyncAt is 25 hours ago', () => {
  const now = new Date('2026-05-21T12:00:00Z')
  const lastSync = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()
  const state = computeFreshnessState(lastSync, now.toISOString(), 10)
  assert.equal(state, 'STALE')
})

test('computeFreshnessState returns MISSING when lastSyncAt is null', () => {
  const state = computeFreshnessState(null, new Date().toISOString(), 0)
  assert.equal(state, 'MISSING')
})

test('computeFreshnessState returns MISSING when lastSyncAt is 73 hours ago', () => {
  const now = new Date('2026-05-21T12:00:00Z')
  const lastSync = new Date(now.getTime() - 73 * 60 * 60 * 1000).toISOString()
  const state = computeFreshnessState(lastSync, now.toISOString(), 10)
  assert.equal(state, 'MISSING')
})

test('computeFreshnessState returns PARTIAL when event count is below minimum', () => {
  const now = new Date('2026-05-21T12:00:00Z')
  const lastSync = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
  // eventCount=3, expectedMinimum defaults to 5
  const state = computeFreshnessState(lastSync, now.toISOString(), 3)
  assert.equal(state, 'PARTIAL')
})

test('computeTrustLevel returns HIGH for score 0.85', () => {
  assert.equal(computeTrustLevel(0.85), 'HIGH')
})

test('computeTrustLevel returns MEDIUM for score 0.7', () => {
  assert.equal(computeTrustLevel(0.7), 'MEDIUM')
})

test('computeTrustLevel returns LOW for score 0.45', () => {
  assert.equal(computeTrustLevel(0.45), 'LOW')
})

test('computeTrustLevel returns INSUFFICIENT for score 0.35', () => {
  assert.equal(computeTrustLevel(0.35), 'INSUFFICIENT')
})

test('assessConnectorFreshness returns ConnectorFreshnessAssessment with correct fields', () => {
  const now = new Date('2026-05-21T12:00:00Z').toISOString()
  const lastSync = new Date(new Date(now).getTime() - 1 * 60 * 60 * 1000).toISOString()
  const assessment = assessConnectorFreshness('OPENAI', 'TENANT-A', lastSync, [], now)
  assert.equal(assessment.connectorId, 'OPENAI')
  assert.equal(assessment.tenantId, 'TENANT-A')
  assert.equal(typeof assessment.trustScore, 'number')
  assert.ok(assessment.trustScore >= 0 && assessment.trustScore <= 1)
  assert.ok(Array.isArray(assessment.stalenessReasonCodes))
  assert.equal(assessment.assessedAt, now)
})

test('assessConnectorFreshness with null lastSyncAt includes NO_SYNC reason', () => {
  const now = new Date('2026-05-21T12:00:00Z').toISOString()
  const assessment = assessConnectorFreshness('CURSOR', 'TENANT-B', null, [], now)
  assert.equal(assessment.freshnessState, 'MISSING')
  assert.ok(assessment.stalenessReasonCodes.includes('NO_SYNC'))
})

// ── AI Mock Telemetry Fixtures ────────────────────────────────────────────

test('buildTokenGovernanceScenario returns 20 events', () => {
  const events = buildTokenGovernanceScenario('TENANT-X')
  assert.ok(events.length > 0)
  assert.equal(events.length, 20)
})

test('buildTokenGovernanceScenario returns events with high costUSD entries', () => {
  const events = buildTokenGovernanceScenario('TENANT-X')
  const expensive = events.filter((e) => e.costUSD > 0.04)
  assert.ok(expensive.length > 0, 'Should have events with costUSD > 0.04')
})

test('buildModelRoutingScenario returns array with length > 0', () => {
  const events = buildModelRoutingScenario('TENANT-X')
  assert.ok(events.length > 0)
})

test('buildVendorSeatReclaimScenario returns events including idle seats', () => {
  const events = buildVendorSeatReclaimScenario('TENANT-X')
  assert.ok(events.length > 0)
  const idle = events.filter((e) => e.seatActive === false)
  assert.ok(idle.length > 0, 'Should have idle seat events')
})

test('buildAgentRuntimeScenario returns array with length > 0', () => {
  const events = buildAgentRuntimeScenario('TENANT-X')
  assert.ok(events.length > 0)
})

test('buildContextGovernanceScenario returns array with length > 0', () => {
  const events = buildContextGovernanceScenario('TENANT-X')
  assert.ok(events.length > 0)
})

test('buildROIGovernanceScenario returns events with null workflowId', () => {
  const events = buildROIGovernanceScenario('TENANT-X')
  assert.ok(events.length > 0)
  const noWorkflow = events.filter((e) => e.workflowId === null)
  assert.ok(noWorkflow.length > 0, 'Should have events without workflowId')
})

test('buildDriftGovernanceScenario returns array with length > 0', () => {
  const events = buildDriftGovernanceScenario('TENANT-X')
  assert.ok(events.length > 0)
})

test('buildOverlapEliminationScenario returns exactly 5 unique userId values with dual seats', () => {
  const events = buildOverlapEliminationScenario('TENANT-X')
  assert.ok(events.length > 0)

  // Collect userIds per connector
  const cursorUsers = new Set(
    events
      .filter((e) => e.connectorId === 'CURSOR' && e.seatActive === true && e.userId?.startsWith('user-overlap'))
      .map((e) => e.userId),
  )
  const windsurfUsers = new Set(
    events
      .filter((e) => e.connectorId === 'WINDSURF' && e.seatActive === true && e.userId?.startsWith('user-overlap'))
      .map((e) => e.userId),
  )
  // Both sets should have exactly 5 overlap userIds
  assert.equal(cursorUsers.size, 5)
  assert.equal(windsurfUsers.size, 5)
})

test('buildMockTelemetrySnapshot returns snapshot with correct snapshotId pattern', () => {
  const snapshot = buildMockTelemetrySnapshot('TENANT-X', 'TOKEN_GOVERNANCE')
  assert.ok(snapshot.snapshotId.includes('TOKEN_GOVERNANCE'))
  assert.ok(snapshot.snapshotId.includes('TENANT-X'))
  assert.equal(snapshot.tenantId, 'TENANT-X')
  assert.ok(Array.isArray(snapshot.normalizedEvents))
  assert.ok(snapshot.normalizedEvents.length > 0)
})

test('buildMockTelemetrySnapshot returns snapshot with FRESH overallFreshnessState', () => {
  const snapshot = buildMockTelemetrySnapshot('TENANT-Y', 'MODEL_ROUTING')
  assert.equal(snapshot.overallFreshnessState, 'FRESH')
  assert.equal(snapshot.overallTrustLevel, 'HIGH')
  assert.ok(snapshot.overallTrustScore > 0)
})

// ── AI Cost Breakdown ─────────────────────────────────────────────────────

function makeCostRecords(): NormalizedCostRecord[] {
  return [
    {
      connectorId: 'OPENAI',
      modelId: 'gpt-4o',
      userId: 'user-1',
      workflowId: 'wf-1',
      agentId: null,
      toolId: null,
      businessUnit: null,
      outcomeId: null,
      inputTokens: 1000,
      outputTokens: 250,
      costUSD: 0.035,
    },
    {
      connectorId: 'OPENAI',
      modelId: 'gpt-4o-mini',
      userId: 'user-2',
      workflowId: 'wf-1',
      agentId: null,
      toolId: null,
      businessUnit: null,
      outcomeId: null,
      inputTokens: 800,
      outputTokens: 200,
      costUSD: 0.002,
    },
    {
      connectorId: 'ANTHROPIC',
      modelId: 'claude-sonnet-4-6',
      userId: 'user-1',
      workflowId: 'wf-2',
      agentId: null,
      toolId: null,
      businessUnit: null,
      outcomeId: null,
      inputTokens: 1500,
      outputTokens: 400,
      costUSD: 0.045,
    },
  ]
}

test('buildCostBreakdown groups by PROVIDER correctly', () => {
  const records = makeCostRecords()
  const report = buildCostBreakdown('TENANT-A', records, 'PROVIDER', '2026-05-01', '2026-05-31')
  assert.equal(report.tenantId, 'TENANT-A')
  const providerKeys = report.breakdowns.map((b) => b.dimensionKey)
  assert.ok(providerKeys.includes('OPENAI'))
  assert.ok(providerKeys.includes('ANTHROPIC'))

  // Sum of breakdown costs should equal total
  const breakdownSum = report.breakdowns.reduce((s, b) => s + b.totalCostUSD, 0)
  assert.ok(Math.abs(breakdownSum - report.totalCostUSD) < 0.0001)
})

test('buildCostBreakdown groups by MODEL correctly', () => {
  const records = makeCostRecords()
  const report = buildCostBreakdown('TENANT-A', records, 'MODEL', '2026-05-01', '2026-05-31')
  const modelKeys = report.breakdowns.map((b) => b.dimensionKey)
  assert.ok(modelKeys.includes('gpt-4o'))
  assert.ok(modelKeys.includes('gpt-4o-mini'))
  assert.ok(modelKeys.includes('claude-sonnet-4-6'))
})

test('buildCostBreakdown percentageOfTotal sums to 100', () => {
  const records = makeCostRecords()
  const report = buildCostBreakdown('TENANT-A', records, 'PROVIDER', '2026-05-01', '2026-05-31')
  const totalPct = report.breakdowns.reduce((s, b) => s + b.percentageOfTotal, 0)
  assert.ok(Math.abs(totalPct - 100) < 0.001, `Expected ~100, got ${totalPct}`)
})

test('buildCostBreakdown totalCostUSD matches sum of all records', () => {
  const records = makeCostRecords()
  const report = buildCostBreakdown('TENANT-A', records, 'USER', '2026-05-01', '2026-05-31')
  const expected = records.reduce((s, r) => s + r.costUSD, 0)
  assert.ok(Math.abs(report.totalCostUSD - expected) < 0.0001)
})

test('buildCostBreakdown with empty records returns zero total', () => {
  const report = buildCostBreakdown('TENANT-A', [], 'PROVIDER', '2026-05-01', '2026-05-31')
  assert.equal(report.totalCostUSD, 0)
  assert.equal(report.breakdowns.length, 0)
})

// ── AI Cost Confidence ────────────────────────────────────────────────────

test('computeCostConfidence returns HIGH when all factors true', () => {
  const factors: CostConfidenceFactors = {
    hasModelPricing: true,
    hasUserId: true,
    hasWorkflowId: true,
    hasFreshTelemetry: true,
    hasSufficientVolume: true,
    attributionCompleteness: 1.0,
  }
  const result = computeCostConfidence(factors)
  assert.equal(result.confidenceLabel, 'HIGH')
  assert.ok(result.confidenceScore >= 0.85)
  assert.equal(result.caveats.length, 0)
})

test('computeCostConfidence returns LOW when all boolean factors false', () => {
  const factors: CostConfidenceFactors = {
    hasModelPricing: false,
    hasUserId: false,
    hasWorkflowId: false,
    hasFreshTelemetry: false,
    hasSufficientVolume: false,
    attributionCompleteness: 0,
  }
  const result = computeCostConfidence(factors)
  // base score is 0.5 → maps to LOW (>= 0.5); INSUFFICIENT requires score < 0.5
  assert.equal(result.confidenceLabel, 'LOW')
  assert.ok(result.confidenceScore <= 0.5)
})

test('caveats array is non-empty when any boolean factor is false', () => {
  const factors: CostConfidenceFactors = {
    hasModelPricing: false,
    hasUserId: true,
    hasWorkflowId: true,
    hasFreshTelemetry: true,
    hasSufficientVolume: true,
    attributionCompleteness: 1.0,
  }
  const result = computeCostConfidence(factors)
  assert.ok(result.caveats.length > 0)
  assert.ok(result.caveats[0]!.includes('pricing'))
})

test('computeCostConfidence confidenceScore is between 0 and 1', () => {
  const factors: CostConfidenceFactors = {
    hasModelPricing: true,
    hasUserId: false,
    hasWorkflowId: false,
    hasFreshTelemetry: true,
    hasSufficientVolume: false,
    attributionCompleteness: 0.5,
  }
  const result = computeCostConfidence(factors)
  assert.ok(result.confidenceScore >= 0 && result.confidenceScore <= 1)
})

test('computeCostConfidence returns factors field matching input', () => {
  const factors: CostConfidenceFactors = {
    hasModelPricing: true,
    hasUserId: true,
    hasWorkflowId: false,
    hasFreshTelemetry: true,
    hasSufficientVolume: true,
    attributionCompleteness: 0.9,
  }
  const result = computeCostConfidence(factors)
  assert.deepEqual(result.factors, factors)
})

// ── AI Cost Attribution Engine ────────────────────────────────────────────

test('computeAttributionReport returns all 5 breakdown dimensions', () => {
  const records = makeCostRecords()
  const factors: CostConfidenceFactors = {
    hasModelPricing: true,
    hasUserId: true,
    hasWorkflowId: true,
    hasFreshTelemetry: true,
    hasSufficientVolume: false,
    attributionCompleteness: 1.0,
  }
  const report = computeAttributionReport('TENANT-A', records, '2026-05-01', '2026-05-31', factors)
  assert.ok('byProvider' in report)
  assert.ok('byModel' in report)
  assert.ok('byUser' in report)
  assert.ok('byWorkflow' in report)
  assert.ok('byAgent' in report)
})

test('telemetryEventsToAttributionRecords maps events correctly', () => {
  const events = buildTokenGovernanceScenario('TENANT-A')
  const records = telemetryEventsToAttributionRecords(events)
  assert.equal(records.length, events.length)
  // toolId and outcomeId should always be null
  assert.ok(records.every((r) => r.toolId === null))
  assert.ok(records.every((r) => r.outcomeId === null))
})

test('computeAttributionReport totalCostUSD equals sum of all record costUSD', () => {
  const records = makeCostRecords()
  const factors: CostConfidenceFactors = {
    hasModelPricing: true,
    hasUserId: true,
    hasWorkflowId: true,
    hasFreshTelemetry: true,
    hasSufficientVolume: false,
    attributionCompleteness: 1.0,
  }
  const report = computeAttributionReport('TENANT-A', records, '2026-05-01', '2026-05-31', factors)
  const expected = records.reduce((s, r) => s + r.costUSD, 0)
  assert.ok(Math.abs(report.totalCostUSD - expected) < 0.0001)
})

test('computeAttributionReport tenantId is set correctly', () => {
  const records = makeCostRecords()
  const factors: CostConfidenceFactors = {
    hasModelPricing: true,
    hasUserId: true,
    hasWorkflowId: true,
    hasFreshTelemetry: true,
    hasSufficientVolume: true,
    attributionCompleteness: 1.0,
  }
  const report = computeAttributionReport('MY-TENANT', records, '2026-05-01', '2026-05-31', factors)
  assert.equal(report.tenantId, 'MY-TENANT')
})

// ── Connector Capability Registry ────────────────────────────────────────

test('All 7 connectors are registered', () => {
  const ids = Object.keys(AI_CONNECTOR_CAPABILITY_REGISTRY)
  assert.equal(ids.length, 7)
})

test("hasCapability('OPENAI', 'READ_TOKEN_USAGE') returns true", () => {
  assert.equal(hasCapability('OPENAI', 'READ_TOKEN_USAGE'), true)
})

test("hasCapability('CURSOR', 'READ_TOKEN_USAGE') returns false", () => {
  assert.equal(hasCapability('CURSOR', 'READ_TOKEN_USAGE'), false)
})

test("hasCapability('ANTHROPIC', 'READ_BILLING_EXPORT') returns true", () => {
  assert.equal(hasCapability('ANTHROPIC', 'READ_BILLING_EXPORT'), true)
})

test('listMockConnectors returns 7 entries', () => {
  const mocks = listMockConnectors()
  assert.equal(mocks.length, 7)
})

test('listReadyConnectors returns 0 entries (all mock)', () => {
  const ready = listReadyConnectors()
  assert.equal(ready.length, 0)
})

test('WINDSURF connector has MANAGE_SEATS capability', () => {
  assert.equal(hasCapability('WINDSURF', 'MANAGE_SEATS'), true)
})

// ── AI Telemetry Jobs ─────────────────────────────────────────────────────

function makeJobCtx(jobType: (typeof AI_TELEMETRY_JOB_TYPES)[number]): AITelemetryJobContext {
  return {
    tenantId: 'TENANT-JOBS',
    jobType,
    triggeredAt: new Date().toISOString(),
    options: {},
  }
}

test('dispatchAITelemetryJob for AI_USAGE_SYNC returns success: true', async () => {
  const result = await dispatchAITelemetryJob(makeJobCtx('AI_USAGE_SYNC'))
  assert.equal(result.success, true)
  assert.equal(result.tenantId, 'TENANT-JOBS')
  assert.equal(result.jobType, 'AI_USAGE_SYNC')
})

test('dispatchAITelemetryJob for AI_SEAT_SYNC returns success: true', async () => {
  const result = await dispatchAITelemetryJob(makeJobCtx('AI_SEAT_SYNC'))
  assert.equal(result.success, true)
})

test('dispatchAITelemetryJob for AI_VENDOR_OVERLAP_SCAN returns recordsProcessed > 0', async () => {
  const result = await dispatchAITelemetryJob(makeJobCtx('AI_VENDOR_OVERLAP_SCAN'))
  assert.equal(result.success, true)
  assert.ok(result.recordsProcessed > 0)
})

test('dispatchAITelemetryJob for AI_BILLING_SYNC returns success: true', async () => {
  const result = await dispatchAITelemetryJob(makeJobCtx('AI_BILLING_SYNC'))
  assert.equal(result.success, true)
})

test('All 9 job types return success: true', async () => {
  for (const jobType of AI_TELEMETRY_JOB_TYPES) {
    const result = await dispatchAITelemetryJob(makeJobCtx(jobType))
    assert.equal(result.success, true, `Expected success for jobType ${jobType}`)
  }
})

test('dispatchAITelemetryJob result includes durationMs >= 0', async () => {
  const result = await dispatchAITelemetryJob(makeJobCtx('AI_DRIFT_SCAN'))
  assert.ok(result.durationMs >= 0)
  assert.equal(result.error, null)
})

// ── AI Simulation State ───────────────────────────────────────────────────

function makeBefore(monthlyCost: number): AISimulationBeforeState {
  return {
    provider: 'OPENAI',
    modelId: 'gpt-4o',
    monthlyTokens: 1_000_000,
    monthlyCostUSD: monthlyCost,
    activeSeats: 50,
    idleSeats: 10,
    agentCount: 3,
    contextWindowUtilization: 0.85,
  }
}

function makeProposed(monthlyCost: number): AISimulationProposedState {
  return {
    provider: 'OPENAI',
    modelId: 'gpt-4o-mini',
    monthlyTokens: 950_000,
    monthlyCostUSD: monthlyCost,
    activeSeats: 40,
    idleSeats: 0,
    agentCount: 3,
    contextWindowUtilization: 0.5,
    changesApplied: ['Switch to GPT-4o-mini for simple tasks'],
  }
}

test('buildSimulationResult with higher before cost returns positive projectedMonthlySavingsUSD', () => {
  const result = buildSimulationResult(
    'TENANT-SIM',
    'exec-sim-1',
    'TOKEN_GOVERNANCE',
    makeBefore(500),
    makeProposed(300),
    0.85,
    'LOW',
    'LOW',
  )
  assert.ok(result.projectedMonthlySavingsUSD > 0)
  assert.equal(result.projectedMonthlySavingsUSD, 200)
})

test('projectedAnnualSavingsUSD equals projectedMonthlySavingsUSD * 12', () => {
  const result = buildSimulationResult(
    'TENANT-SIM',
    'exec-sim-2',
    'TOKEN_GOVERNANCE',
    makeBefore(500),
    makeProposed(300),
    0.85,
    'LOW',
    'LOW',
  )
  assert.equal(result.projectedAnnualSavingsUSD, result.projectedMonthlySavingsUSD * 12)
})

test('qualityRisk and blastRadius are preserved in simulation result', () => {
  const result = buildSimulationResult(
    'TENANT-SIM',
    'exec-sim-3',
    'MODEL_ROUTING',
    makeBefore(400),
    makeProposed(250),
    0.75,
    'MEDIUM',
    'HIGH',
  )
  assert.equal(result.qualityRisk, 'MEDIUM')
  assert.equal(result.blastRadius, 'HIGH')
})

test('buildSimulationResult with equal costs returns zero savings', () => {
  const result = buildSimulationResult(
    'TENANT-SIM',
    'exec-sim-4',
    'CONTEXT_GOVERNANCE',
    makeBefore(300),
    makeProposed(300),
    0.6,
    'NONE',
    'LOW',
  )
  assert.equal(result.projectedMonthlySavingsUSD, 0)
  assert.equal(result.projectedAnnualSavingsUSD, 0)
})

test('buildSimulationResult includes correct tenantId and executionId', () => {
  const result = buildSimulationResult(
    'TENANT-ABC',
    'exec-XYZ',
    'AGENT_RUNTIME_GOVERNANCE',
    makeBefore(200),
    makeProposed(150),
    0.9,
    'LOW',
    'MEDIUM',
  )
  assert.equal(result.tenantId, 'TENANT-ABC')
  assert.equal(result.executionId, 'exec-XYZ')
})

// ── AI Verification Strategies ────────────────────────────────────────────

test('verifyTokenReduction returns verified: true with confidence 0.82', async () => {
  const simResult = buildSimulationResult(
    'TENANT-VER',
    'exec-ver-1',
    'TOKEN_GOVERNANCE',
    makeBefore(500),
    makeProposed(300),
    0.85,
    'LOW',
    'LOW',
  )
  const outcome = await verifyTokenReduction('TENANT-VER', 'exec-ver-1', simResult)
  assert.equal(outcome.verified, true)
  assert.equal(outcome.confidence, 0.82)
  assert.equal(outcome.verificationStrategy, 'TOKEN_REDUCTION_VERIFICATION')
})

test('verifySeatReclaim returns verified: true with confidence 0.90', async () => {
  const outcome = await verifySeatReclaim('TENANT-VER', 'exec-ver-2', {
    reclaimedSeatCount: 5,
    estimatedMonthlySavingsUSD: 250,
  })
  assert.equal(outcome.verified, true)
  assert.equal(outcome.confidence, 0.90)
  assert.equal(outcome.verificationStrategy, 'SEAT_RECLAIM_VERIFICATION')
})

test('verifyModelRouting returns verified: true with verificationStrategy set', async () => {
  const outcome = await verifyModelRouting('TENANT-VER', 'exec-ver-3', {
    targetModelId: 'gpt-4o-mini',
    workloadCount: 10,
  })
  assert.equal(outcome.verified, true)
  assert.equal(outcome.verificationStrategy, 'MODEL_ROUTING_VERIFICATION')
})

test('verifyVendorConsolidation returns verified: true', async () => {
  const outcome = await verifyVendorConsolidation('TENANT-VER', 'exec-ver-4', {
    removedVendors: ['WINDSURF'],
    projectedSavingsUSD: 1000,
  })
  assert.equal(outcome.verified, true)
  assert.equal(outcome.verificationStrategy, 'VENDOR_CONSOLIDATION_VERIFICATION')
})

test('verifyContextCompression returns verified: true', async () => {
  const outcome = await verifyContextCompression('TENANT-VER', 'exec-ver-5', {
    targetUtilization: 0.5,
  })
  assert.equal(outcome.verified, true)
  assert.equal(outcome.verificationStrategy, 'CONTEXT_COMPRESSION_VERIFICATION')
})

test('verifyAgentRetirement returns verified: true with retiredAgentIds in details', async () => {
  const outcome = await verifyAgentRetirement('TENANT-VER', 'exec-ver-6', {
    retiredAgentIds: ['agent-alpha', 'agent-beta'],
  })
  assert.equal(outcome.verified, true)
  assert.equal(outcome.verificationStrategy, 'AGENT_RETIREMENT_VERIFICATION')
  assert.ok('retiredAgentIds' in outcome.details)
})

// ── AI Drift Rules ────────────────────────────────────────────────────────

test('detectTokenSpike returns triggered: false with default (empty) context', async () => {
  const result = await detectTokenSpike('TENANT-DRIFT', 'exec-drift-1', {})
  assert.equal(result.triggered, false)
  assert.equal(result.ruleId, 'TOKEN_SPIKE')
})

test('detectTokenSpike returns triggered: true when currentMonthCostUSD > baselineCostUSD * 2', async () => {
  const result = await detectTokenSpike('TENANT-DRIFT', 'exec-drift-2', {
    currentMonthCostUSD: 300,
    baselineCostUSD: 100,
  })
  assert.equal(result.triggered, true)
  assert.equal(result.severity, 'HIGH')
})

test('detectTokenSpike returns triggered: false when values are below threshold', async () => {
  const result = await detectTokenSpike('TENANT-DRIFT', 'exec-drift-3', {
    currentMonthCostUSD: 150,
    baselineCostUSD: 100,
  })
  assert.equal(result.triggered, false)
})

test('buildEvidenceHash returns an 8-char hex string', () => {
  const hash = buildEvidenceHash('TENANT-DRIFT', 'TOKEN_SPIKE')
  assert.equal(hash.length, 8)
  assert.ok(/^[0-9a-f]{8}$/.test(hash), `Expected 8-char hex, got: ${hash}`)
})

test('buildEvidenceHash is deterministic for same inputs', () => {
  const h1 = buildEvidenceHash('TENANT-A', 'RULE-X')
  const h2 = buildEvidenceHash('TENANT-A', 'RULE-X')
  assert.equal(h1, h2)
})

test('detectModelCreep returns AIDriftRuleResult with correct shape', async () => {
  const result = await detectModelCreep('TENANT-DRIFT', 'exec-drift-4', {})
  assert.equal(result.ruleId, 'MODEL_CREEP')
  assert.equal(typeof result.triggered, 'boolean')
  assert.equal(typeof result.detail, 'string')
  assert.ok(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(result.severity))
  assert.ok(typeof result.evidenceHash === 'string')
})

test('detectCostSpike returns AIDriftRuleResult with correct shape', async () => {
  const result = await detectCostSpike('TENANT-DRIFT', 'exec-drift-5', {})
  assert.equal(result.ruleId, 'COST_SPIKE')
  assert.equal(result.triggered, false)
})

test('detectUnauthorizedUsage returns AIDriftRuleResult with CRITICAL severity', async () => {
  const result = await detectUnauthorizedUsage('TENANT-DRIFT', 'exec-drift-6', {})
  assert.equal(result.ruleId, 'UNAUTHORIZED_USAGE')
  assert.equal(result.severity, 'CRITICAL')
})

test('detectSeatExpansion returns AIDriftRuleResult with triggered: false', async () => {
  const result = await detectSeatExpansion('TENANT-DRIFT', 'exec-drift-7', {})
  assert.equal(result.triggered, false)
  assert.equal(result.ruleId, 'SEAT_EXPANSION')
})

test('detectAgentProliferation returns AIDriftRuleResult with correct ruleId', async () => {
  const result = await detectAgentProliferation('TENANT-DRIFT', 'exec-drift-8', {})
  assert.equal(result.ruleId, 'AGENT_PROLIFERATION')
  assert.equal(typeof result.detectedAt, 'string')
})

// ── AI Proof Graph ────────────────────────────────────────────────────────

test('buildProofNode returns node with correct nodeType and trustScore', () => {
  const node = buildProofNode('TELEMETRY', 'TENANT-PG', { source: 'test' }, 'rec-1', 0.9, true)
  assert.equal(node.nodeType, 'TELEMETRY')
  assert.equal(node.trustScore, 0.9)
  assert.equal(node.tenantId, 'TENANT-PG')
  assert.equal(node.isMockData, true)
  assert.equal(node.recommendationId, 'rec-1')
})

test('buildProofNode with null recommendationId sets field to null', () => {
  const node = buildProofNode('COST', 'TENANT-PG', {}, null, 0.75, false)
  assert.equal(node.recommendationId, null)
  assert.equal(node.isMockData, false)
})

test('buildMockProofGraph returns graph with 3 nodes and 2 edges', () => {
  const graph = buildMockProofGraph('TENANT-PG', 'rec-abc')
  assert.equal(graph.nodes.length, 3)
  assert.equal(graph.edges.length, 2)
})

test('overallTrustScore equals min trust score across nodes', () => {
  const graph = buildMockProofGraph('TENANT-PG', 'rec-xyz')
  const minTrust = Math.min(...graph.nodes.map((n) => n.trustScore))
  assert.equal(graph.overallTrustScore, minTrust)
})

test('isMockData is true for mock graph', () => {
  const graph = buildMockProofGraph('TENANT-PG', 'rec-mock')
  assert.equal(graph.isMockData, true)
})

test('buildMockProofGraph tenantId and recommendationId are set correctly', () => {
  const graph = buildMockProofGraph('MY-TENANT', 'my-rec-id')
  assert.equal(graph.tenantId, 'MY-TENANT')
  assert.equal(graph.recommendationId, 'my-rec-id')
})
