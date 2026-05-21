import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  compileEconomicOperationsPack,
} from '../lib/economic-operations-pack-factory.js'
import {
  EconomicOperationsPackRegistry,
  globalPackRegistry,
} from '../lib/economic-operations-pack-registry.js'
import {
  EconomicOperationsPackRuntime,
  globalPackRuntime,
} from '../lib/economic-operations-pack-runtime.js'
import type {
  EconomicOperationsPackDefinition,
  PackUXMetadata,
} from '../lib/economic-operations-pack-types.js'

// ---------------------------------------------------------------------------
// Test fixture: minimal valid pack definition
// ---------------------------------------------------------------------------

type TestEvidence = { tenantId: string; value: number }
type TestRec = { title: string; saving: number }
type TestSim = { projectedSaving: number }
type TestPayload = { targetId: string }
type TestResult = { confirmed: boolean }

function buildMinimalPackDef(
  id: string,
): EconomicOperationsPackDefinition<TestEvidence, TestRec, TestSim, TestPayload, TestResult> {
  const ux: PackUXMetadata = {
    displayName: 'Test Pack',
    shortDescription: 'A minimal test pack',
    longDescription: 'A minimal test pack for factory validation.',
    iconSlug: 'test',
    domainColour: 'gray-500',
    estimatedTimeToValueDays: 7,
    documentationUrl: null,
    tags: ['test'],
    requiredFeatureFlags: [],
  }

  return {
    id,
    name: 'Test Pack',
    version: '1.0.0',
    domain: 'AI_GOVERNANCE',
    category: 'TOKEN_GOVERNANCE',
    description: 'Minimal test pack',
    riskProfile: 'LOW',
    blastRadiusClassification: 'LOW',
    minimumTenantMode: 'PILOT_READ_ONLY',
    supportedExecutionModes: ['SIMULATION_ONLY'] as const,
    requiredCapabilities: [] as const,
    requiredConnectorScopes: [] as const,
    defaultApprovalPolicy: 'NONE',
    supportsRollback: false,
    supportsVerification: true,
    supportsDriftDetection: true,
    supportsSimulation: true,

    governance: {
      minimumRolesForRecommendation: ['VIEWER'] as const,
      minimumRolesForExecution: ['ECONOMIC_OPERATOR'] as const,
      requiredPermissions: ['RECOMMENDATION_READ'] as const,
      allowedIntentTypes: ['SIMULATE'] as const,
    },

    evidenceLayer: {
      collector: {
        async collect(tenantId: string, _context: Record<string, unknown>): Promise<TestEvidence> {
          return { tenantId, value: 42 }
        },
      },
      normalizer: {
        normalize: (raw: unknown) => raw as TestEvidence,
      },
      trustScorer: {
        minimumTrustThreshold: 0.5,
        score: (_ev: TestEvidence) => 0.85,
      },
      savingsEstimator: {
        estimateMonthlySavings: (_ev: TestEvidence) => 500,
        estimateAnnualSavings: (_ev: TestEvidence) => 6000,
        confidence: (_ev: TestEvidence) => 0.9,
      },
    },

    recommendationLayer: {
      generator: {
        async generate(tenantId: string, _evidence: TestEvidence): Promise<TestRec[]> {
          return [{ title: `Optimize for ${tenantId}`, saving: 500 }]
        },
      },
      maxRecommendations: 10,
    },

    simulationLayer: {
      generator: {
        async simulate(_tenantId: string, _executionId: string, _evidence: TestEvidence): Promise<TestSim> {
          return { projectedSaving: 500 }
        },
      },
    },

    executionLayer: {
      adapter: {
        async execute(_tenantId: string, _executionId: string, _payload: TestPayload): Promise<TestResult> {
          return { confirmed: false }
        },
      },
      rollbackAdapter: null,
      async checkReadiness(_tenantId: string, _executionId: string) {
        return { ready: true, blockers: [] as string[] }
      },
    },

    verificationLayer: {
      strategy: {
        async verify(_tenantId: string, _executionId: string, _expected: TestResult) {
          return { verified: true, confidence: 0.9, details: {} as Record<string, unknown> }
        },
      },
    },

    driftLayer: {
      rules: [
        {
          ruleId: 'test-drift-rule',
          description: 'Test drift rule',
          severity: 'LOW' as const,
          async evaluate(_tenantId: string, _executionId: string, _context: Record<string, unknown>) {
            return { triggered: false, detail: 'No drift' }
          },
        },
      ],
    },

    ux,
  }
}

// ---------------------------------------------------------------------------
// Tests: Pack Factory
// ---------------------------------------------------------------------------

test('compileEconomicOperationsPack returns a compiled pack with correct id', () => {
  const def = buildMinimalPackDef('test-pack-compile-1')
  const compiled = compileEconomicOperationsPack(def)
  assert.equal(compiled.packId, 'test-pack-compile-1')
  assert.equal(compiled.definition.name, 'Test Pack')
})

test('compiled pack exposes all lifecycle methods', () => {
  const compiled = compileEconomicOperationsPack(buildMinimalPackDef('test-lifecycle'))
  assert.equal(typeof compiled.runRecommendations, 'function')
  assert.equal(typeof compiled.runSimulation, 'function')
  assert.equal(typeof compiled.checkReadiness, 'function')
  assert.equal(typeof compiled.runVerification, 'function')
  assert.equal(typeof compiled.detectDrift, 'function')
  assert.equal(typeof compiled.getUXMetadata, 'function')
})

test('compiled pack runRecommendations returns array', async () => {
  const compiled = compileEconomicOperationsPack(buildMinimalPackDef('test-recs'))
  const recs = await compiled.runRecommendations('TENANT-A', {})
  assert.ok(Array.isArray(recs))
  assert.ok(recs.length > 0)
})

test('compiled pack runSimulation returns simulation output', async () => {
  const compiled = compileEconomicOperationsPack(buildMinimalPackDef('test-sim'))
  const evidence: TestEvidence = { tenantId: 'TENANT-A', value: 42 }
  const sim = await compiled.runSimulation('TENANT-A', 'exec-1', evidence)
  assert.ok(sim !== null)
})

test('compiled pack checkReadiness returns ready state', async () => {
  const compiled = compileEconomicOperationsPack(buildMinimalPackDef('test-ready'))
  const result = await compiled.checkReadiness('TENANT-A', 'exec-1')
  assert.equal(result.ready, true)
  assert.deepEqual(result.blockers, [])
})

test('compiled pack runVerification returns verified state', async () => {
  const compiled = compileEconomicOperationsPack(buildMinimalPackDef('test-verify'))
  const result = await compiled.runVerification('TENANT-A', 'exec-1', { confirmed: true })
  assert.equal(result.verified, true)
  assert.ok(result.confidence >= 0 && result.confidence <= 1)
})

test('compiled pack detectDrift returns drift results', async () => {
  const compiled = compileEconomicOperationsPack(buildMinimalPackDef('test-drift'))
  const results = await compiled.detectDrift('TENANT-A', 'exec-1')
  assert.ok(Array.isArray(results))
  assert.equal(results.length, 1)
  assert.equal(results[0]!.ruleId, 'test-drift-rule')
  assert.equal(results[0]!.triggered, false)
})

test('compiled pack getUXMetadata returns metadata', () => {
  const compiled = compileEconomicOperationsPack(buildMinimalPackDef('test-ux'))
  const ux = compiled.getUXMetadata()
  assert.equal(ux.displayName, 'Test Pack')
  assert.ok(typeof ux.shortDescription === 'string')
})

// ---------------------------------------------------------------------------
// Tests: Pack Registry
// ---------------------------------------------------------------------------

test('EconomicOperationsPackRegistry registers and retrieves packs', () => {
  const registry = new EconomicOperationsPackRegistry()
  const pack = compileEconomicOperationsPack(buildMinimalPackDef('reg-test-1'))
  registry.register(pack)
  const found = registry.get('reg-test-1')
  assert.ok(found !== undefined)
  assert.equal(found.packId, 'reg-test-1')
})

test('EconomicOperationsPackRegistry throws on duplicate registration', () => {
  const registry = new EconomicOperationsPackRegistry()
  const pack = compileEconomicOperationsPack(buildMinimalPackDef('reg-dup'))
  registry.register(pack)
  assert.throws(
    () => registry.register(pack),
    (e: unknown) => e instanceof Error && e.message.includes('reg-dup'),
  )
})

test('EconomicOperationsPackRegistry listByDomain filters correctly', () => {
  const registry = new EconomicOperationsPackRegistry()
  registry.register(compileEconomicOperationsPack(buildMinimalPackDef('reg-domain-1')))
  const ai = registry.listByDomain('AI_GOVERNANCE')
  assert.ok(ai.every((p) => p.definition.domain === 'AI_GOVERNANCE'))
  assert.ok(ai.length >= 1)
})

test('EconomicOperationsPackRegistry get returns undefined for unknown id', () => {
  const registry = new EconomicOperationsPackRegistry()
  assert.equal(registry.get('not-a-real-pack'), undefined)
})

// ---------------------------------------------------------------------------
// Tests: Pack Runtime
// ---------------------------------------------------------------------------

test('EconomicOperationsPackRuntime generates recommendations via registry', async () => {
  const registry = new EconomicOperationsPackRegistry()
  const runtime = new EconomicOperationsPackRuntime(registry)
  const pack = compileEconomicOperationsPack(buildMinimalPackDef('rt-rec-1'))
  registry.register(pack)

  const results = await runtime.generateRecommendations('rt-rec-1', 'TENANT-A', {})
  assert.ok(Array.isArray(results))
  assert.ok(results.length > 0)
  assert.equal(results[0]!.packId, 'rt-rec-1')
  assert.equal(results[0]!.tenantId, 'TENANT-A')
})

test('EconomicOperationsPackRuntime evaluateReadiness returns blockers array', async () => {
  const registry = new EconomicOperationsPackRegistry()
  const runtime = new EconomicOperationsPackRuntime(registry)
  registry.register(compileEconomicOperationsPack(buildMinimalPackDef('rt-ready-1')))

  const result = await runtime.evaluateReadiness('rt-ready-1', 'TENANT-A', 'exec-1')
  assert.ok('ready' in result)
  assert.ok('blockers' in result)
})

test('EconomicOperationsPackRuntime detectDrift returns typed results', async () => {
  const registry = new EconomicOperationsPackRegistry()
  const runtime = new EconomicOperationsPackRuntime(registry)
  registry.register(compileEconomicOperationsPack(buildMinimalPackDef('rt-drift-1')))

  const results = await runtime.detectDrift('rt-drift-1', 'TENANT-A', 'exec-1')
  assert.ok(Array.isArray(results))
})

test('EconomicOperationsPackRuntime throws for unknown pack', async () => {
  const runtime = new EconomicOperationsPackRuntime(new EconomicOperationsPackRegistry())
  await assert.rejects(
    () => runtime.generateRecommendations('does-not-exist', 'TENANT-A', {}),
  )
})

test('globalPackRegistry and globalPackRuntime singletons are available', () => {
  assert.ok(globalPackRegistry !== undefined)
  assert.ok(globalPackRuntime !== undefined)
})

// ---------------------------------------------------------------------------
// Tests: AI Economic Operations Registry
// ---------------------------------------------------------------------------

test('AI_ECONOMIC_OPERATIONS_REGISTRY contains all 8 domains', async () => {
  const { AI_ECONOMIC_OPERATIONS_REGISTRY, AI_GOVERNANCE_DOMAINS } = await import(
    '../lib/ai-economic-operations-registry.js'
  )
  assert.equal(Object.keys(AI_ECONOMIC_OPERATIONS_REGISTRY).length, AI_GOVERNANCE_DOMAINS.length)
  assert.ok('TOKEN_GOVERNANCE' in AI_ECONOMIC_OPERATIONS_REGISTRY)
  assert.ok('MODEL_ROUTING' in AI_ECONOMIC_OPERATIONS_REGISTRY)
  assert.ok('AI_VENDOR_GOVERNANCE' in AI_ECONOMIC_OPERATIONS_REGISTRY)
  assert.ok('AGENT_RUNTIME_GOVERNANCE' in AI_ECONOMIC_OPERATIONS_REGISTRY)
  assert.ok('CONTEXT_GOVERNANCE' in AI_ECONOMIC_OPERATIONS_REGISTRY)
  assert.ok('AI_ROI_GOVERNANCE' in AI_ECONOMIC_OPERATIONS_REGISTRY)
  assert.ok('AI_DRIFT_GOVERNANCE' in AI_ECONOMIC_OPERATIONS_REGISTRY)
  assert.ok('AI_OVERLAP_ELIMINATION' in AI_ECONOMIC_OPERATIONS_REGISTRY)
})

test('listDomainsByPriority returns CRITICAL domains first', async () => {
  const { listDomainsByPriority } = await import('../lib/ai-economic-operations-registry.js')
  const sorted = listDomainsByPriority()
  assert.equal(sorted[0]!.strategicPriority, 'CRITICAL')
})

// ---------------------------------------------------------------------------
// Tests: AI Connector Layer
// ---------------------------------------------------------------------------

test('AI connector registry contains all 4 initial connectors', async () => {
  const { globalAIConnectorRegistry } = await import(
    '../lib/connectors/ai/ai-connector-registry.js'
  )
  const connectors = globalAIConnectorRegistry.list()
  const ids = connectors.map((c) => c.id)
  assert.ok(ids.includes('OPENAI'))
  assert.ok(ids.includes('ANTHROPIC'))
  assert.ok(ids.includes('CURSOR'))
  assert.ok(ids.includes('WINDSURF'))
})

test('OpenAI connector mock sync returns usage records', async () => {
  const { openAIConnector } = await import('../lib/connectors/ai/openai-connector.js')
  const result = await openAIConnector.runSync('TENANT-TEST')
  assert.equal(result.connectorId, 'OPENAI')
  assert.equal(result.health, 'HEALTHY')
  assert.ok(result.usageRecords.length > 0)
  assert.ok(result.seatRecords.length > 0)
})

test('Anthropic connector mock sync returns multi-model usage', async () => {
  const { anthropicConnector } = await import('../lib/connectors/ai/anthropic-connector.js')
  const result = await anthropicConnector.runSync('TENANT-TEST')
  assert.equal(result.connectorId, 'ANTHROPIC')
  const modelIds = new Set(result.usageRecords.map((r) => r.modelId))
  assert.ok(modelIds.size >= 2, 'Should have multiple model tiers')
})

test('Cursor connector mock sync returns seat and workspace data', async () => {
  const { cursorConnector } = await import('../lib/connectors/ai/cursor-connector.js')
  const result = await cursorConnector.runSync('TENANT-TEST')
  assert.equal(result.connectorId, 'CURSOR')
  assert.ok(result.seatRecords.length > 0)
  const idleSeats = result.seatRecords.filter((s) => s.isIdle)
  assert.ok(idleSeats.length > 0, 'Should have idle seats for reclaim recommendations')
})

test('Windsurf connector identifies overlap users with Cursor', async () => {
  const { windsurfConnector } = await import('../lib/connectors/ai/windsurf-connector.js')
  const { WINDSURF_CURSOR_OVERLAP_EMAILS } = await import('../lib/connectors/ai/windsurf-connector.js')
  const result = await windsurfConnector.runSync('TENANT-TEST')
  const windsurfEmails = result.seatRecords.map((s) => s.email)
  const overlapCount = WINDSURF_CURSOR_OVERLAP_EMAILS.filter((e) => windsurfEmails.includes(e)).length
  assert.ok(overlapCount > 0, 'Should detect users with both Cursor and Windsurf seats')
})

// ---------------------------------------------------------------------------
// Tests: AI Token Pricing Catalog
// ---------------------------------------------------------------------------

test('AI token pricing catalog covers major models', async () => {
  const { getModelPricing, listModelsByTier } = await import('../lib/ai-token-pricing-catalog.js')

  const gpt4o = getModelPricing('openai', 'gpt-4o')
  assert.ok(gpt4o !== undefined)
  assert.ok(gpt4o!.inputPricePerMToken > 0)

  const opus = getModelPricing('anthropic', 'claude-opus-4-7')
  assert.ok(opus !== undefined)

  const economy = listModelsByTier('ECONOMY')
  assert.ok(economy.length > 0)

  const reasoning = listModelsByTier('REASONING')
  assert.ok(reasoning.length > 0)
})

test('computeTokenCost returns correct cost for known model', async () => {
  const { getModelPricing, computeTokenCost } = await import('../lib/ai-token-pricing-catalog.js')
  const record = getModelPricing('openai', 'gpt-4o')
  assert.ok(record !== undefined)
  // 1M input at $5/MT = $5.00
  const cost = computeTokenCost(record!, 1_000_000, 0)
  assert.ok(Math.abs(cost - 5.0) < 0.01, `Expected ~$5.00, got $${cost}`)
})

test('findCheaperAlternative suggests a less expensive model', async () => {
  const { findCheaperAlternative } = await import('../lib/ai-token-pricing-catalog.js')
  const alt = findCheaperAlternative('gpt-4o', 'ECONOMY')
  assert.ok(alt !== undefined, 'Should find a cheaper alternative to GPT-4o')
  assert.ok(alt!.inputPricePerMToken < 5.0, 'Alternative should be cheaper than GPT-4o')
})
