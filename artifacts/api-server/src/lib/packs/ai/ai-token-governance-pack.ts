/**
 * ai-token-governance-pack.ts
 *
 * AI Token Governance pack for the Economic Operations platform.
 * Governs AI token consumption by detecting runaway models, oversized contexts,
 * excessive retries, and premium model overuse — then recommending targeted
 * interventions (model downgrades, cache enforcement, context truncation, etc.).
 */

import { compileEconomicOperationsPack } from '../../economic-operations-pack-factory.js';
import type { EconomicOperationsPackDefinition } from '../../economic-operations-pack-types.js';
import { globalPackRegistry } from '../../economic-operations-pack-registry.js';

// ---------------------------------------------------------------------------
// Evidence type
// ---------------------------------------------------------------------------

type ModelBreakdownEntry = {
  modelId: string;
  vendor: string;
  tier: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'REASONING';
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  requestCount: number;
  avgContextTokens: number;
  percentOfTotalCost: number;
};

type RunawayCandidate = {
  modelId: string;
  reason: string; // 'OVERSIZED_CONTEXT' | 'HIGH_RETRY_RATE' | 'RECURSIVE_LOOP' | 'REASONING_OVERUSE'
  estimatedWastePct: number;
};

type AITokenEvidence = {
  tenantId: string;
  windowDays: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  totalRequests: number;
  avgContextTokens: number;
  avgOutputTokens: number;
  modelBreakdown: ModelBreakdownEntry[];
  runawayCandidates: RunawayCandidate[];
  retryCount: number;
  errorCount: number;
  agentRequestPct: number;
};

// ---------------------------------------------------------------------------
// Recommendation type
// ---------------------------------------------------------------------------

type AITokenRecommendation = {
  recommendationType:
    | 'MODEL_DOWNGRADE'
    | 'PROMPT_COMPRESSION'
    | 'CACHE_ENFORCEMENT'
    | 'RETRY_LIMIT'
    | 'CONTEXT_TRUNCATION'
    | 'ROUTING_OPTIMIZATION'
    | 'BUDGET_ENFORCEMENT';
  targetModelId: string;
  currentMonthlyCostUSD: number;
  projectedMonthlyCostUSD: number;
  projectedMonthlySavings: number;
  savingsPct: number;
  confidence: number;
  rationale: string;
  executionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
};

// ---------------------------------------------------------------------------
// Simulation type
// ---------------------------------------------------------------------------

type AITokenSimulation = {
  tenantId: string;
  executionId: string;
  projectedTokenReductionPct: number;
  projectedCostReductionUSD: number;
  projectedMonthlyCostUSD: number;
  interventions: Array<{
    type: string;
    modelId: string;
    estimatedSavingsUSD: number;
  }>;
};

// ---------------------------------------------------------------------------
// Execution payload / result
// ---------------------------------------------------------------------------

type AITokenPayload = {
  tenantId: string;
  recommendations: AITokenRecommendation[];
};

type AITokenResult = {
  tenantId: string;
  executionId: string;
  appliedInterventions: string[];
  estimatedMonthlySavings: number;
  verificationWindowDays: number;
};

// ---------------------------------------------------------------------------
// Deterministic mock evidence helper
// ---------------------------------------------------------------------------

function buildMockEvidence(tenantId: string): AITokenEvidence {
  // Deterministic figures derived from tenantId length to avoid Math.random()
  const seed = tenantId.length + tenantId.charCodeAt(0);

  const premiumCost = 420 + seed * 3;
  const standardCost = 180 + seed * 1.5;
  const economyCost = 60 + seed;
  const reasoningCost = 280 + seed * 2;
  const totalCost = premiumCost + standardCost + economyCost + reasoningCost;

  return {
    tenantId,
    windowDays: 30,
    totalInputTokens: 48_000_000 + seed * 10_000,
    totalOutputTokens: 12_000_000 + seed * 2_000,
    totalCostUSD: totalCost,
    totalRequests: 95_000 + seed * 100,
    avgContextTokens: 4_200 + seed * 10,
    avgOutputTokens: 820 + seed * 2,
    modelBreakdown: [
      {
        modelId: 'gpt-4o',
        vendor: 'openai',
        tier: 'PREMIUM',
        inputTokens: 18_000_000 + seed * 3_000,
        outputTokens: 4_500_000 + seed * 500,
        costUSD: premiumCost,
        requestCount: 28_000 + seed * 30,
        avgContextTokens: 6_100 + seed * 5,
        percentOfTotalCost: Math.round((premiumCost / totalCost) * 100),
      },
      {
        modelId: 'claude-3-5-sonnet-20241022',
        vendor: 'anthropic',
        tier: 'STANDARD',
        inputTokens: 16_000_000 + seed * 2_000,
        outputTokens: 4_000_000 + seed * 400,
        costUSD: standardCost,
        requestCount: 38_000 + seed * 40,
        avgContextTokens: 3_800 + seed * 4,
        percentOfTotalCost: Math.round((standardCost / totalCost) * 100),
      },
      {
        modelId: 'gpt-4o-mini',
        vendor: 'openai',
        tier: 'ECONOMY',
        inputTokens: 10_000_000 + seed * 1_500,
        outputTokens: 2_500_000 + seed * 300,
        costUSD: economyCost,
        requestCount: 22_000 + seed * 20,
        avgContextTokens: 2_100 + seed * 3,
        percentOfTotalCost: Math.round((economyCost / totalCost) * 100),
      },
      {
        modelId: 'o1-preview',
        vendor: 'openai',
        tier: 'REASONING',
        inputTokens: 4_000_000 + seed * 500,
        outputTokens: 1_000_000 + seed * 100,
        costUSD: reasoningCost,
        requestCount: 7_000 + seed * 10,
        avgContextTokens: 9_200 + seed * 8,
        percentOfTotalCost: Math.round((reasoningCost / totalCost) * 100),
      },
    ],
    runawayCandidates: [
      {
        modelId: 'o1-preview',
        reason: 'REASONING_OVERUSE',
        estimatedWastePct: 38,
      },
      {
        modelId: 'gpt-4o',
        reason: 'OVERSIZED_CONTEXT',
        estimatedWastePct: 22,
      },
    ],
    retryCount: 4_200 + seed * 5,
    errorCount: 1_100 + seed * 2,
    agentRequestPct: 34 + (seed % 10),
  };
}

// ---------------------------------------------------------------------------
// Pack definition
// ---------------------------------------------------------------------------

const definition: EconomicOperationsPackDefinition<
  AITokenEvidence,
  AITokenRecommendation,
  AITokenSimulation,
  AITokenPayload,
  AITokenResult
> = {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: 'ai-token-governance',
  name: 'AI Token Governance',
  version: '1.0.0',

  // ── Classification ────────────────────────────────────────────────────────
  domain: 'AI_GOVERNANCE',
  category: 'TOKEN_GOVERNANCE',
  description:
    'Detects token consumption anomalies — runaway contexts, retry storms, reasoning model overuse ' +
    'and premium model misallocation — and recommends prompt compression, cache enforcement, ' +
    'model downgrades, and context truncation to reduce AI spend.',
  riskProfile: 'MEDIUM',
  blastRadiusClassification: 'LOW',

  // ── Operational constraints ───────────────────────────────────────────────
  minimumTenantMode: 'PRODUCTION_APPROVAL_REQUIRED',
  supportedExecutionModes: ['SIMULATION_ONLY', 'GOVERNED_EXECUTION'],
  requiredCapabilities: ['READ_COSTS', 'READ_ACTIVITY'],
  requiredConnectorScopes: [],
  defaultApprovalPolicy: 'SINGLE_APPROVER',

  // ── Feature flags ─────────────────────────────────────────────────────────
  supportsSimulation: true,
  supportsVerification: true,
  supportsDriftDetection: true,
  supportsRollback: false,

  // ── Governance ───────────────────────────────────────────────────────────
  governance: {
    minimumRolesForRecommendation: ['ECONOMIC_OPERATOR', 'ADMIN', 'OWNER'],
    minimumRolesForExecution: ['ADMIN', 'OWNER'],
    requiredPermissions: ['RECOMMENDATION_READ', 'SIMULATION_RUN', 'EXECUTION_REQUEST'],
    allowedIntentTypes: [
      'SIMULATE',
      'REQUEST_APPROVAL',
      'APPROVE',
      'REJECT',
      'EXECUTE',
      'VERIFY',
      'ACKNOWLEDGE_DRIFT',
      'BLOCK',
    ],
  },

  // ── Evidence layer ────────────────────────────────────────────────────────
  evidenceLayer: {
    collector: {
      async collect(tenantId: string, _context: Record<string, unknown>): Promise<AITokenEvidence> {
        return buildMockEvidence(tenantId);
      },
    },
    normalizer: {
      normalize(raw: unknown): AITokenEvidence {
        // Evidence is already in canonical form from the collector.
        return raw as AITokenEvidence;
      },
    },
    trustScorer: {
      minimumTrustThreshold: 0.6,
      score(evidence: AITokenEvidence): number {
        // Start at 0.95; deduct for runaway candidates (each costs 0.05 trust)
        // and penalise for older data windows (> 14 days reduces trust).
        let score = 0.95;
        score -= Math.min(evidence.runawayCandidates.length * 0.05, 0.2);
        if (evidence.windowDays > 14) {
          score -= 0.05;
        }
        // Clamp to [0.6, 0.95]
        return Math.max(0.6, Math.min(0.95, score));
      },
    },
    savingsEstimator: {
      estimateMonthlySavings(evidence: AITokenEvidence): number {
        // Sum estimated waste from premium / reasoning models
        const premiumAndReasoning = evidence.modelBreakdown.filter(
          (m) => m.tier === 'PREMIUM' || m.tier === 'REASONING',
        );
        const wasteableCost = premiumAndReasoning.reduce((sum, m) => sum + m.costUSD, 0);
        // Conservative 25% achievable savings from downgrades + compression
        return Math.round(wasteableCost * 0.25);
      },
      estimateAnnualSavings(evidence: AITokenEvidence): number {
        return this.estimateMonthlySavings(evidence) * 12;
      },
      confidence(evidence: AITokenEvidence): number {
        // Higher confidence when we have >2 runaway candidates with clear waste
        const highWaste = evidence.runawayCandidates.filter((r) => r.estimatedWastePct > 20);
        return highWaste.length >= 2 ? 0.85 : 0.65;
      },
    },
  },

  // ── Recommendation layer ──────────────────────────────────────────────────
  recommendationLayer: {
    maxRecommendations: 3,
    generator: {
      async generate(
        _tenantId: string,
        evidence: AITokenEvidence,
      ): Promise<AITokenRecommendation[]> {
        const recommendations: AITokenRecommendation[] = [];

        // 1. MODEL_DOWNGRADE — if premium models exceed 40% of total cost
        const premiumCost = evidence.modelBreakdown
          .filter((m) => m.tier === 'PREMIUM' || m.tier === 'REASONING')
          .reduce((sum, m) => sum + m.costUSD, 0);
        const premiumPct = (premiumCost / evidence.totalCostUSD) * 100;

        if (premiumPct > 40) {
          const savings = Math.round(premiumCost * 0.3);
          recommendations.push({
            recommendationType: 'MODEL_DOWNGRADE',
            targetModelId: 'gpt-4o',
            currentMonthlyCostUSD: Math.round(premiumCost),
            projectedMonthlyCostUSD: Math.round(premiumCost - savings),
            projectedMonthlySavings: savings,
            savingsPct: Math.round(30),
            confidence: 0.82,
            rationale:
              `Premium and reasoning models account for ${Math.round(premiumPct)}% of total AI cost. ` +
              'Routing SIMPLE and MODERATE tasks to gpt-4o-mini or claude-haiku would preserve quality ' +
              'for low-complexity workloads while capturing ~30% cost reduction on those request classes.',
            executionRisk: 'LOW',
          });
        }

        // 2. CACHE_ENFORCEMENT — if retry rate is high (retries > 4% of requests)
        const retryRate = evidence.retryCount / evidence.totalRequests;
        if (retryRate > 0.04) {
          const cacheSavings = Math.round(evidence.totalCostUSD * 0.12);
          recommendations.push({
            recommendationType: 'CACHE_ENFORCEMENT',
            targetModelId: 'all',
            currentMonthlyCostUSD: Math.round(evidence.totalCostUSD),
            projectedMonthlyCostUSD: Math.round(evidence.totalCostUSD - cacheSavings),
            projectedMonthlySavings: cacheSavings,
            savingsPct: 12,
            confidence: 0.78,
            rationale:
              `Retry rate is ${(retryRate * 100).toFixed(1)}% of total requests, indicating repeated identical prompts ` +
              'or transient failures triggering redundant calls. Enabling semantic prompt caching and enforcing ' +
              'a cache-first routing layer would eliminate duplicate token charges.',
            executionRisk: 'LOW',
          });
        }

        // 3. CONTEXT_TRUNCATION — if runaway candidate has OVERSIZED_CONTEXT
        const oversized = evidence.runawayCandidates.find((r) => r.reason === 'OVERSIZED_CONTEXT');
        if (oversized) {
          const oversizedEntry = evidence.modelBreakdown.find(
            (m) => m.modelId === oversized.modelId,
          );
          if (oversizedEntry) {
            const truncSavings = Math.round(oversizedEntry.costUSD * (oversized.estimatedWastePct / 100));
            recommendations.push({
              recommendationType: 'CONTEXT_TRUNCATION',
              targetModelId: oversized.modelId,
              currentMonthlyCostUSD: Math.round(oversizedEntry.costUSD),
              projectedMonthlyCostUSD: Math.round(oversizedEntry.costUSD - truncSavings),
              projectedMonthlySavings: truncSavings,
              savingsPct: oversized.estimatedWastePct,
              confidence: 0.74,
              rationale:
                `Model "${oversized.modelId}" shows average context of ${oversizedEntry.avgContextTokens.toLocaleString()} tokens, ` +
                `with ${oversized.estimatedWastePct}% of those tokens estimated as low-signal padding. ` +
                'Enforcing a sliding-window context truncation policy (retain last 2000 tokens + system prompt) ' +
                'would reduce input token spend proportionally.',
              executionRisk: 'MEDIUM',
            });
          }
        }

        return recommendations;
      },
    },
  },

  // ── Simulation layer ──────────────────────────────────────────────────────
  simulationLayer: {
    generator: {
      async simulate(
        tenantId: string,
        executionId: string,
        evidence: AITokenEvidence,
      ): Promise<AITokenSimulation> {
        const premiumCost = evidence.modelBreakdown
          .filter((m) => m.tier === 'PREMIUM' || m.tier === 'REASONING')
          .reduce((sum, m) => sum + m.costUSD, 0);
        const downgradesSavings = Math.round(premiumCost * 0.3);
        const cacheSavings = Math.round(evidence.totalCostUSD * 0.12);
        const totalSavings = downgradesSavings + cacheSavings;

        return {
          tenantId,
          executionId,
          projectedTokenReductionPct: 18,
          projectedCostReductionUSD: totalSavings,
          projectedMonthlyCostUSD: Math.round(evidence.totalCostUSD - totalSavings),
          interventions: [
            {
              type: 'MODEL_DOWNGRADE',
              modelId: 'gpt-4o → gpt-4o-mini (SIMPLE tasks)',
              estimatedSavingsUSD: downgradesSavings,
            },
            {
              type: 'CACHE_ENFORCEMENT',
              modelId: 'all',
              estimatedSavingsUSD: cacheSavings,
            },
          ],
        };
      },
    },
  },

  // ── Execution layer ───────────────────────────────────────────────────────
  executionLayer: {
    adapter: {
      async execute(
        tenantId: string,
        executionId: string,
        payload: AITokenPayload,
      ): Promise<AITokenResult> {
        // Token governance changes are policy/config changes only — not directly
        // executable via connector. Describe what would be applied.
        const interventions = payload.recommendations.map(
          (r) => `${r.recommendationType} on ${r.targetModelId}`,
        );
        const totalSavings = payload.recommendations.reduce(
          (sum, r) => sum + r.projectedMonthlySavings,
          0,
        );
        return {
          tenantId,
          executionId,
          appliedInterventions: interventions,
          estimatedMonthlySavings: totalSavings,
          verificationWindowDays: 30,
        };
      },
    },
    rollbackAdapter: null,
    async checkReadiness(
      _tenantId: string,
      _executionId: string,
    ): Promise<{ ready: boolean; blockers: string[] }> {
      // Execution is advisory (policy/config) so always ready structurally;
      // actual config changes are handled out-of-band.
      return { ready: true, blockers: [] };
    },
  },

  // ── Verification layer ────────────────────────────────────────────────────
  verificationLayer: {
    strategy: {
      async verify(
        tenantId: string,
        executionId: string,
        expected: AITokenResult,
      ): Promise<{ verified: boolean; confidence: number; details: Record<string, unknown> }> {
        // After 30 days, re-collect evidence and compare cost delta.
        // In this implementation we return a structured description; real
        // verification would diff live evidence against the pre-execution baseline.
        return {
          verified: false,
          confidence: 0.0,
          details: {
            tenantId,
            executionId,
            verificationNote:
              'Re-collect token cost evidence after 30 days and compare against baseline snapshot.',
            expectedMonthlySavings: expected.estimatedMonthlySavings,
            verificationWindowDays: expected.verificationWindowDays,
            status: 'PENDING_WINDOW_COMPLETION',
          },
        };
      },
    },
  },

  // ── Drift layer ───────────────────────────────────────────────────────────
  driftLayer: {
    rules: [
      {
        ruleId: 'TOKEN_EXPANSION',
        description:
          'Detects sustained growth in total token consumption (>20% month-over-month) ' +
          'that may indicate new runaway agents or context bloat re-emerging.',
        severity: 'MEDIUM',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const momGrowthPct = typeof context['momTokenGrowthPct'] === 'number'
            ? context['momTokenGrowthPct']
            : 0;
          const triggered = momGrowthPct > 20;
          return {
            triggered,
            detail: triggered
              ? `Token consumption grew ${momGrowthPct}% month-over-month for tenant ${tenantId} (executionId: ${executionId}). ` +
                'Investigate new agent deployments or context window policy relaxation.'
              : `Token growth within acceptable threshold (${momGrowthPct}% MoM).`,
          };
        },
      },
      {
        ruleId: 'MODEL_CREEP',
        description:
          'Detects when premium or reasoning model cost share creeps back above 45% ' +
          'after a downgrade intervention, indicating routing rules have been bypassed.',
        severity: 'HIGH',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const premiumCostPct = typeof context['premiumModelCostPct'] === 'number'
            ? context['premiumModelCostPct']
            : 0;
          const triggered = premiumCostPct > 45;
          return {
            triggered,
            detail: triggered
              ? `Premium/reasoning models now represent ${premiumCostPct}% of AI cost for tenant ${tenantId} ` +
                `(executionId: ${executionId}), exceeding the 45% drift threshold. ` +
                'Routing rules may have been overridden or new premium integrations added.'
              : `Premium model cost share is ${premiumCostPct}% — within post-intervention bounds.`,
          };
        },
      },
    ],
  },

  // ── UX ────────────────────────────────────────────────────────────────────
  ux: {
    displayName: 'AI Token Governance',
    shortDescription: 'Reduce AI token spend by detecting runaway models and enforcing routing policies.',
    longDescription:
      'The AI Token Governance pack analyses your organisation\'s LLM token consumption across all vendors ' +
      'and models over a rolling 30-day window. It identifies runaway candidates — models exhibiting oversized ' +
      'contexts, retry storms, recursive loops, or inappropriate reasoning enablement — and generates targeted ' +
      'recommendations: model downgrades for SIMPLE/TRIVIAL tasks, cache-first routing to eliminate duplicate ' +
      'charges, context truncation policies, and budget guardrails. Simulation projects token and cost reduction ' +
      'before any policy change is applied; drift detection alerts if premium model share or token growth re-exceeds ' +
      'post-intervention thresholds.',
    iconSlug: 'token-governance',
    domainColour: 'violet-600',
    estimatedTimeToValueDays: 14,
    documentationUrl: null,
    tags: [
      'ai',
      'token',
      'governance',
      'cost-reduction',
      'model-routing',
      'prompt-compression',
      'cache',
    ],
    requiredFeatureFlags: ['ai_governance_enabled'],
  },
};

// ---------------------------------------------------------------------------
// Compile and export
// ---------------------------------------------------------------------------

export const aiTokenGovernancePack = compileEconomicOperationsPack(definition);

// Register with the global registry at module initialisation time.
globalPackRegistry.register(aiTokenGovernancePack);
