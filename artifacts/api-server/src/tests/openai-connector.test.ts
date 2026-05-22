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

import { describe, it, expect, beforeEach } from 'vitest';
import { openaiCapabilityRegistry } from '../lib/connectors/openai/openai-capability-registry.js';
import { openaiCredentialManager } from '../lib/connectors/openai/openai-credentials.js';
import { openaiTelemetryNormalizer } from '../lib/connectors/openai/openai-telemetry-normalizer.js';
import { openaiRecommendationEngine } from '../lib/connectors/openai/openai-recommendations.js';
import { openaiEvidenceSourceManager } from '../lib/connectors/openai/openai-evidence-integration.js';
import { openaiProofGraphBuilder } from '../lib/connectors/openai/openai-proof-graph-integration.js';
import type { RawOpenAITelemetryBatch } from '../lib/connectors/openai/openai-raw-telemetry-dto.js';
import type { NormalizedAITelemetryEvent } from '../lib/ai-telemetry-types.js';

describe('OpenAI Connector - Capability Registry', () => {
  it('should list all capabilities', () => {
    const caps = openaiCapabilityRegistry.listCapabilities();
    expect(caps).toContain('CREDENTIAL_VALIDATION');
    expect(caps).toContain('USAGE_DATA_READ');
    expect(caps).toContain('COST_DATA_READ');
    expect(caps.length).toBe(6);
  });

  it('should compute overall state from capability statuses', () => {
    const statuses = [
      { capability: 'CREDENTIAL_VALIDATION' as const, state: 'READY' as const, lastCheckedAt: new Date().toISOString() },
      { capability: 'USAGE_DATA_READ' as const, state: 'READY' as const, lastCheckedAt: new Date().toISOString() },
      { capability: 'COST_DATA_READ' as const, state: 'DEGRADED' as const, lastCheckedAt: new Date().toISOString() },
    ];

    const overall = openaiCapabilityRegistry.computeOverallState(statuses);
    expect(overall).toBe('DEGRADED');
  });

  it('should compute readiness score', () => {
    const statuses = [
      { capability: 'CREDENTIAL_VALIDATION' as const, state: 'READY' as const, lastCheckedAt: new Date().toISOString() },
      { capability: 'USAGE_DATA_READ' as const, state: 'READY' as const, lastCheckedAt: new Date().toISOString() },
      { capability: 'COST_DATA_READ' as const, state: 'UNAVAILABLE' as const, lastCheckedAt: new Date().toISOString() },
    ];

    const score = openaiCapabilityRegistry.computeReadinessScore(statuses);
    expect(score).toBeCloseTo(2 / 3, 2);
  });
});

describe('OpenAI Connector - Credentials', () => {
  it('should not leak API key in logs', () => {
    const metadata = openaiCredentialManager.getSafeMetadata();
    expect(metadata).not.toHaveProperty('apiKey');
    expect(metadata).toHaveProperty('maskedKey');
  });

  it('should mask API key properly', () => {
    const masked = openaiCredentialManager.getMaskedApiKey();
    // Should not contain full key
    if (openaiCredentialManager.isConfigured()) {
      expect(masked).toContain('*');
    }
  });

  it('should validate credential format', () => {
    // Test with empty credentials
    const validation = openaiCredentialManager.validateFormat();
    if (!openaiCredentialManager.isConfigured()) {
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('OPENAI_API_KEY not configured');
    }
  });
});

describe('OpenAI Connector - Normalization', () => {
  let sampleBatch: RawOpenAITelemetryBatch;

  beforeEach(() => {
    sampleBatch = {
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
        },
      ],
      costEvents: [
        {
          projectId: 'proj-1',
          modelId: 'gpt-4',
          costUSD: 0.15,
          costDate: '2026-05-22',
        },
        {
          projectId: 'proj-1',
          modelId: 'gpt-3.5-turbo',
          costUSD: 0.03,
          costDate: '2026-05-22',
        },
      ],
      projects: [
        {
          projectId: 'proj-1',
          projectName: 'Project One',
          status: 'active',
          createdAt: '2026-01-01',
        },
      ],
      users: [
        {
          userId: 'user-1',
          userName: 'John Doe',
          email: 'john@example.com',
          status: 'active',
          createdAt: '2026-01-01',
        },
      ],
    };
  });

  it('should normalize raw telemetry to canonical schema', () => {
    const normalized = openaiTelemetryNormalizer.normalizeBatch(sampleBatch);

    expect(normalized.length).toBeGreaterThan(0);
    expect(normalized[0]).toHaveProperty('eventId');
    expect(normalized[0]).toHaveProperty('connectorId', 'OPENAI');
    expect(normalized[0]).toHaveProperty('sourceOfTruth', 'CONNECTOR');
  });

  it('should set isEstimated flag when userId is missing', () => {
    const normalized = openaiTelemetryNormalizer.normalizeBatch(sampleBatch);
    const eventWithoutUser = normalized.find((e) => e.userId === null);

    expect(eventWithoutUser).toBeDefined();
    expect(eventWithoutUser?.isEstimated).toBe(true);
  });

  it('should merge cost data with usage events', () => {
    const normalized = openaiTelemetryNormalizer.normalizeBatch(sampleBatch);
    const gpt4Events = normalized.filter((e) => e.modelId === 'gpt-4');

    expect(gpt4Events[0].costUSD).toBeGreaterThan(0);
  });

  it('should assess data quality', () => {
    const normalized = openaiTelemetryNormalizer.normalizeBatch(sampleBatch);
    const quality = openaiTelemetryNormalizer.assessDataQuality(normalized);

    expect(quality).toHaveProperty('estimatedFraction');
    expect(quality).toHaveProperty('usageDataComplete');
    expect(quality).toHaveProperty('costDataComplete');
    expect(quality).toHaveProperty('attributionComplete');
  });
});

describe('OpenAI Connector - Recommendations', () => {
  let sampleEvents: NormalizedAITelemetryEvent[];

  beforeEach(() => {
    sampleEvents = [
      {
        eventId: 'evt-1',
        connectorId: 'OPENAI',
        eventType: 'TOKEN_USAGE',
        tenantId: 'tenant-123',
        modelId: 'gpt-4',
        userId: 'user-1',
        workflowId: 'workflow-1',
        agentId: null,
        inputTokens: 500,
        outputTokens: 1500, // High output ratio
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
        inputTokens: 50,
        outputTokens: 100, // Simple task with expensive model
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
    ];
  });

  it('should generate token governance recommendations', () => {
    const recs = openaiRecommendationEngine.generateRecommendations('tenant-123', sampleEvents);
    const tokenRecs = recs.filter((r) => r.type === 'TOKEN_GOVERNANCE');

    expect(tokenRecs.length).toBeGreaterThan(0);
  });

  it('should generate model routing recommendations', () => {
    const recs = openaiRecommendationEngine.generateRecommendations('tenant-123', sampleEvents);
    const routingRecs = recs.filter((r) => r.type === 'MODEL_ROUTING');

    expect(routingRecs.length).toBeGreaterThan(0);
  });

  it('should estimate monthly savings', () => {
    const recs = openaiRecommendationEngine.generateRecommendations('tenant-123', sampleEvents);

    for (const rec of recs) {
      expect(rec.estimatedMonthlySavings).toBeGreaterThanOrEqual(0);
      expect(rec.actionableSteps.length).toBeGreaterThan(0);
    }
  });
});

describe('OpenAI Connector - Evidence Integration', () => {
  it('should switch between evidence sources', () => {
    expect(openaiEvidenceSourceManager.getCurrentSource()).toBe('MOCK');

    openaiEvidenceSourceManager.enableSource('OPENAI_CONNECTOR');
    openaiEvidenceSourceManager.switchSource('OPENAI_CONNECTOR');
    expect(openaiEvidenceSourceManager.getCurrentSource()).toBe('OPENAI_CONNECTOR');

    openaiEvidenceSourceManager.switchSource('MOCK');
    expect(openaiEvidenceSourceManager.getCurrentSource()).toBe('MOCK');
  });

  it('should tag events with source', () => {
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
    expect(tagged[0].sourceOfTruth).toBe('OPENAI_CONNECTOR');
  });
});

describe('OpenAI Connector - Proof Graph', () => {
  it('should build connector source node', () => {
    const node = openaiProofGraphBuilder.buildConnectorSourceNode();

    expect(node.nodeType).toBe('CONNECTOR_SOURCE');
    expect(node.properties.connectorId).toBe('OPENAI');
    expect(node.properties).not.toHaveProperty('apiKey');
  });

  it('should build capability nodes', () => {
    const nodes = openaiProofGraphBuilder.buildCapabilityNodes(['CREDENTIAL_VALIDATION', 'USAGE_DATA_READ']);

    expect(nodes.length).toBe(2);
    expect(nodes[0].nodeType).toBe('CONNECTOR_CAPABILITY');
  });

  it('should build complete proof graph without secrets', () => {
    const { nodes, edges } = openaiProofGraphBuilder.buildCompleteProofGraph(
      'batch-1',
      'tenant-123',
      ['evt-1', 'evt-2'],
      [{ id: 'rec-1', type: 'TOKEN_GOVERNANCE', severity: 'HIGH', estimatedSavings: 100 }],
      0.5,
      { 'gpt-4': 0.3, 'gpt-3.5-turbo': 0.2 },
      { 'user-1': 0.4, 'user-2': 0.1 },
    );

    expect(nodes.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThan(0);

    // Ensure no secrets in graph
    const jsonStr = JSON.stringify({ nodes, edges });
    expect(jsonStr).not.toContain('sk-');
  });
});
