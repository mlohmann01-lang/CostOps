/**
 * OpenAI Connector Tests (Part 11)
 *
 * Test suite covering:
 * - Readiness checks
 * - Normalization
 * - Cost attribution
 * - Recommendations
 * - Security (credential masking, no key leakage)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { openaiCapabilityRegistry } from '../lib/connectors/openai/openai-capability-registry.js';
import { openaiCredentialManager } from '../lib/connectors/openai/openai-credentials.js';
import { openaiTelemetryNormalizer } from '../lib/connectors/openai/openai-telemetry-normalizer.js';
import { openaiRecommendationEngine } from '../lib/connectors/openai/openai-recommendations.js';
import { openaiEvidenceSourceManager } from '../lib/connectors/openai/openai-evidence-integration.js';
import { openaiProofGraphBuilder } from '../lib/connectors/openai/openai-proof-graph-integration.js';
import type { RawOpenAITelemetryBatch } from '../lib/connectors/openai/openai-raw-telemetry-dto.js';
import type { NormalizedAITelemetryEvent } from '../lib/ai-telemetry-types.js';

// --- Capability Registry ---

test('capability registry: lists all 6 capabilities', () => {
  const caps = openaiCapabilityRegistry.listCapabilities();
  assert.ok(caps.includes('CREDENTIAL_VALIDATION'), 'Missing CREDENTIAL_VALIDATION');
  assert.ok(caps.includes('USAGE_DATA_READ'), 'Missing USAGE_DATA_READ');
  assert.ok(caps.includes('COST_DATA_READ'), 'Missing COST_DATA_READ');
  assert.strictEqual(caps.length, 6, 'Should have exactly 6 capabilities');
});

test('capability registry: computes overall state as DEGRADED when some are degraded', () => {
  const statuses = [
    { capability: 'CREDENTIAL_VALIDATION' as const, state: 'READY' as const, lastCheckedAt: new Date().toISOString() },
    { capability: 'USAGE_DATA_READ' as const, state: 'READY' as const, lastCheckedAt: new Date().toISOString() },
    { capability: 'COST_DATA_READ' as const, state: 'DEGRADED' as const, lastCheckedAt: new Date().toISOString() },
  ];
  const overall = openaiCapabilityRegistry.computeOverallState(statuses);
  assert.strictEqual(overall, 'DEGRADED');
});

test('capability registry: computes overall state as UNAVAILABLE when critical cap unavailable', () => {
  const statuses = [
    { capability: 'CREDENTIAL_VALIDATION' as const, state: 'UNAVAILABLE' as const, lastCheckedAt: new Date().toISOString() },
    { capability: 'USAGE_DATA_READ' as const, state: 'READY' as const, lastCheckedAt: new Date().toISOString() },
  ];
  const overall = openaiCapabilityRegistry.computeOverallState(statuses);
  assert.strictEqual(overall, 'UNAVAILABLE');
});

test('capability registry: computes readiness score correctly', () => {
  const statuses = [
    { capability: 'CREDENTIAL_VALIDATION' as const, state: 'READY' as const, lastCheckedAt: new Date().toISOString() },
    { capability: 'USAGE_DATA_READ' as const, state: 'READY' as const, lastCheckedAt: new Date().toISOString() },
    { capability: 'COST_DATA_READ' as const, state: 'UNAVAILABLE' as const, lastCheckedAt: new Date().toISOString() },
  ];
  const score = openaiCapabilityRegistry.computeReadinessScore(statuses);
  assert.strictEqual(Math.round(score * 100) / 100, 0.67, 'Score should be ~0.67 (2/3)');
});

// --- Credentials ---

test('credentials: getSafeMetadata never exposes apiKey', () => {
  const metadata = openaiCredentialManager.getSafeMetadata();
  assert.ok(!('apiKey' in metadata), 'apiKey must not be present in safe metadata');
  assert.ok('maskedKey' in metadata, 'maskedKey should be present');
});

test('credentials: getMaskedApiKey returns masked format if configured', () => {
  const masked = openaiCredentialManager.getMaskedApiKey();
  assert.ok(typeof masked === 'string', 'maskedKey should be a string');
  // Should not expose full key (either "<not configured>" or contains asterisks)
  if (openaiCredentialManager.isConfigured()) {
    assert.ok(masked.includes('*'), 'configured key should show asterisks');
  }
});

test('credentials: validates format correctly', () => {
  const validation = openaiCredentialManager.validateFormat();
  if (!openaiCredentialManager.isConfigured()) {
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.reason?.includes('not configured'), 'reason should mention not configured');
  }
});

// --- Normalization ---

const buildSampleBatch = (): RawOpenAITelemetryBatch => ({
  metadata: {
    connectorId: 'OPENAI',
    tenantId: 'tenant-123',
    syncStartedAt: new Date().toISOString(),
    syncEndedAt: new Date().toISOString(),
    periodStartDate: '2026-05-01',
    periodEndDate: '2026-05-22',
    dataSourceVersion: '1.0',
    usageEventsIngested: 2,
    costEventsIngested: 2,
    projectsIngested: 1,
    usersIngested: 1,
    errorCount: 0,
    hasPartialUsageData: false,
    hasPartialCostData: false,
    hasMissingAttribution: false,
  },
  usageEvents: [
    {
      projectId: 'proj-1',
      modelId: 'gpt-4',
      inputTokens: 100,
      outputTokens: 50,
      usageDate: '2026-05-22',
      userId: 'user-1',
      workflowId: 'workflow-1',
    },
    {
      projectId: 'proj-1',
      modelId: 'gpt-3.5-turbo',
      inputTokens: 200,
      outputTokens: 100,
      usageDate: '2026-05-22',
      // No userId — isEstimated should be true
    },
  ],
  costEvents: [
    { projectId: 'proj-1', modelId: 'gpt-4', costUSD: 0.15, costDate: '2026-05-22' },
    { projectId: 'proj-1', modelId: 'gpt-3.5-turbo', costUSD: 0.03, costDate: '2026-05-22' },
  ],
  projects: [{ projectId: 'proj-1', projectName: 'Project One', status: 'active', createdAt: '2026-01-01' }],
  users: [{ userId: 'user-1', userName: 'John Doe', email: 'john@example.com', status: 'active', createdAt: '2026-01-01' }],
});

test('normalization: produces normalized events with sourceOfTruth=CONNECTOR', () => {
  const batch = buildSampleBatch();
  const normalized = openaiTelemetryNormalizer.normalizeBatch(batch);

  assert.ok(normalized.length > 0, 'Should produce at least one normalized event');
  assert.ok(
    normalized.every((e) => e.sourceOfTruth === 'CONNECTOR'),
    'All events should have sourceOfTruth=CONNECTOR',
  );
});

test('normalization: sets isEstimated=true when userId is missing', () => {
  const batch = buildSampleBatch();
  const normalized = openaiTelemetryNormalizer.normalizeBatch(batch);
  const eventWithoutUser = normalized.find((e) => e.userId === null);

  assert.ok(eventWithoutUser, 'Should have at least one event without userId');
  assert.strictEqual(eventWithoutUser!.isEstimated, true);
});

test('normalization: merges cost from costEvents into usage events', () => {
  const batch = buildSampleBatch();
  const normalized = openaiTelemetryNormalizer.normalizeBatch(batch);
  const gpt4Events = normalized.filter((e) => e.modelId === 'gpt-4');

  assert.ok(gpt4Events.length > 0, 'Should have gpt-4 events');
  assert.ok(gpt4Events.every((e) => e.costUSD > 0), 'gpt-4 events should have cost data');
});

test('normalization: assesses data quality with all required fields', () => {
  const batch = buildSampleBatch();
  const normalized = openaiTelemetryNormalizer.normalizeBatch(batch);
  const quality = openaiTelemetryNormalizer.assessDataQuality(normalized);

  assert.ok('estimatedFraction' in quality);
  assert.ok('usageDataComplete' in quality);
  assert.ok('costDataComplete' in quality);
  assert.ok('attributionComplete' in quality);
  assert.ok(typeof quality.estimatedFraction === 'number');
  assert.ok(quality.estimatedFraction >= 0 && quality.estimatedFraction <= 1);
});

// --- Recommendations ---

// 3 simple-task gpt-4 events (avg input=55) — triggers MODEL_ROUTING recommendation
// evt-1 has high output ratio (>40%) — triggers TOKEN_GOVERNANCE recommendation
const buildSampleEvents = (): NormalizedAITelemetryEvent[] => [
  {
    eventId: 'evt-1',
    connectorId: 'OPENAI',
    eventType: 'TOKEN_USAGE',
    tenantId: 'tenant-123',
    modelId: 'gpt-4',
    userId: 'user-1',
    workflowId: 'workflow-1',
    agentId: null,
    inputTokens: 50,
    outputTokens: 200, // High output ratio (80%)
    costUSD: 0.15,
    seatActive: null,
    seatLastActiveAt: null,
    embeddingDimensions: null,
    normalizedAt: new Date().toISOString(),
    rawEventId: 'raw-1',
    dataVersion: '1.0',
    sourceOfTruth: 'CONNECTOR',
    isEstimated: false,
  },
  {
    eventId: 'evt-2',
    connectorId: 'OPENAI',
    eventType: 'TOKEN_USAGE',
    tenantId: 'tenant-123',
    modelId: 'gpt-4',
    userId: 'user-2',
    workflowId: null,
    agentId: null,
    inputTokens: 60, // avg: (50+60+55)/3 = 55 — below 100 threshold
    outputTokens: 30,
    costUSD: 0.08,
    seatActive: null,
    seatLastActiveAt: null,
    embeddingDimensions: null,
    normalizedAt: new Date().toISOString(),
    rawEventId: 'raw-2',
    dataVersion: '1.0',
    sourceOfTruth: 'CONNECTOR',
    isEstimated: false,
  },
  {
    eventId: 'evt-3',
    connectorId: 'OPENAI',
    eventType: 'TOKEN_USAGE',
    tenantId: 'tenant-123',
    modelId: 'gpt-4',
    userId: 'user-1',
    workflowId: null,
    agentId: null,
    inputTokens: 55,
    outputTokens: 25,
    costUSD: 0.06,
    seatActive: null,
    seatLastActiveAt: null,
    embeddingDimensions: null,
    normalizedAt: new Date().toISOString(),
    rawEventId: 'raw-3',
    dataVersion: '1.0',
    sourceOfTruth: 'CONNECTOR',
    isEstimated: false,
  },
];

test('recommendations: generates TOKEN_GOVERNANCE recommendation for high output ratio', () => {
  const events = buildSampleEvents();
  const recs = openaiRecommendationEngine.generateRecommendations('tenant-123', events);
  const tokenRecs = recs.filter((r) => r.type === 'TOKEN_GOVERNANCE');
  assert.ok(tokenRecs.length > 0, 'Should generate TOKEN_GOVERNANCE recommendation for >40% output ratio');
});

test('recommendations: generates MODEL_ROUTING recommendation for cheap tasks on expensive model', () => {
  const events = buildSampleEvents();
  const recs = openaiRecommendationEngine.generateRecommendations('tenant-123', events);
  const routingRecs = recs.filter((r) => r.type === 'MODEL_ROUTING');
  assert.ok(routingRecs.length > 0, 'Should generate MODEL_ROUTING recommendation');
});

test('recommendations: all recommendations have positive savings estimate and steps', () => {
  const events = buildSampleEvents();
  const recs = openaiRecommendationEngine.generateRecommendations('tenant-123', events);
  assert.ok(recs.length > 0, 'Should generate at least one recommendation');
  for (const rec of recs) {
    assert.ok(rec.estimatedMonthlySavings >= 0, `Savings should be non-negative: ${rec.id}`);
    assert.ok(rec.actionableSteps.length > 0, `Should have steps: ${rec.id}`);
  }
});

// --- Evidence Integration ---

test('evidence integration: switches between MOCK and OPENAI_CONNECTOR', () => {
  // Reset to MOCK first
  openaiEvidenceSourceManager.switchSource('MOCK');
  assert.strictEqual(openaiEvidenceSourceManager.getCurrentSource(), 'MOCK');

  openaiEvidenceSourceManager.enableSource('OPENAI_CONNECTOR');
  openaiEvidenceSourceManager.switchSource('OPENAI_CONNECTOR');
  assert.strictEqual(openaiEvidenceSourceManager.getCurrentSource(), 'OPENAI_CONNECTOR');

  openaiEvidenceSourceManager.switchSource('MOCK');
  assert.strictEqual(openaiEvidenceSourceManager.getCurrentSource(), 'MOCK');
});

test('evidence integration: tags events with evidenceSource', () => {
  const events: NormalizedAITelemetryEvent[] = [
    {
      eventId: 'evt-1',
      connectorId: 'OPENAI',
      eventType: 'TOKEN_USAGE',
      tenantId: 'tenant-123',
      modelId: 'gpt-4',
      userId: null,
      workflowId: null,
      agentId: null,
      inputTokens: 100,
      outputTokens: 50,
      costUSD: 0.1,
      seatActive: null,
      seatLastActiveAt: null,
      embeddingDimensions: null,
      normalizedAt: new Date().toISOString(),
      rawEventId: 'raw-1',
      dataVersion: '1.0',
    },
  ];

  const tagged = openaiEvidenceSourceManager.tagEventsWithSource(events, 'OPENAI_CONNECTOR');
  assert.strictEqual(tagged[0].evidenceSource, 'OPENAI_CONNECTOR');
});

// --- Proof Graph ---

test('proof graph: connector source node has no secrets', () => {
  const node = openaiProofGraphBuilder.buildConnectorSourceNode();
  assert.strictEqual(node.nodeType, 'CONNECTOR_SOURCE');
  assert.strictEqual(node.properties.connectorId, 'OPENAI');
  assert.ok(!('apiKey' in node.properties), 'apiKey must not appear in proof graph node');
});

test('proof graph: capability nodes reference correct types', () => {
  const nodes = openaiProofGraphBuilder.buildCapabilityNodes(['CREDENTIAL_VALIDATION', 'USAGE_DATA_READ']);
  assert.strictEqual(nodes.length, 2);
  assert.ok(nodes.every((n) => n.nodeType === 'CONNECTOR_CAPABILITY'));
});

test('proof graph: complete graph has no sk- strings anywhere', () => {
  const { nodes, edges } = openaiProofGraphBuilder.buildCompleteProofGraph(
    'batch-1',
    'tenant-123',
    ['evt-1', 'evt-2'],
    [{ id: 'rec-1', type: 'TOKEN_GOVERNANCE', severity: 'HIGH', estimatedSavings: 100 }],
    0.5,
    { 'gpt-4': 0.3, 'gpt-3.5-turbo': 0.2 },
    { 'user-1': 0.4, 'user-2': 0.1 },
  );

  assert.ok(nodes.length > 0, 'Should have proof graph nodes');
  assert.ok(edges.length > 0, 'Should have proof graph edges');

  const jsonStr = JSON.stringify({ nodes, edges });
  assert.ok(!jsonStr.includes('sk-'), 'Proof graph must not contain API key prefix');
});
