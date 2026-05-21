/**
 * ai-model-routing-pack.ts
 *
 * AI Model Routing pack for the Economic Operations platform.
 * Identifies over-qualified model usage — premium models handling TRIVIAL or SIMPLE
 * tasks — and recommends task-complexity-aware routing rules to shift workloads to
 * cheaper, equally capable models.
 */

import { compileEconomicOperationsPack } from '../../economic-operations-pack-factory.js';
import type { EconomicOperationsPackDefinition } from '../../economic-operations-pack-types.js';
import { globalPackRegistry } from '../../economic-operations-pack-registry.js';

// ---------------------------------------------------------------------------
// Evidence types
// ---------------------------------------------------------------------------

type ModelUsageEntry = {
  modelId: string;
  vendor: string;
  tier: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'REASONING';
  requestCount: number;
  avgComplexityBand: 'TRIVIAL' | 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'EXPERT';
  monthlyCostUSD: number;
  overqualifiedPct: number; // % of requests where model is overqualified for task
};

type ModelRoutingEvidence = {
  tenantId: string;
  modelUsage: ModelUsageEntry[];
  totalMonthlyCostUSD: number;
  estimatedWastedCostUSD: number;
};

// ---------------------------------------------------------------------------
// Recommendation types
// ---------------------------------------------------------------------------

type ModelRoutingRecommendation = {
  recommendationType:
    | 'DOWNGRADE_TO_MINI'
    | 'TASK_CLASSIFICATION_ROUTING'
    | 'CACHE_FIRST_ROUTING'
    | 'REASONING_ONLY_WHEN_REQUIRED';
  fromModelId: string;
  toModelId: string;
  affectedRequestCount: number;
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

type ModelRoutingSimulation = {
  tenantId: string;
  executionId: string;
  projectedRoutingRulesAdded: number;
  projectedMonthlySavingsUSD: number;
  projectedMonthlyCostUSD: number;
  routingChanges: Array<{
    fromModel: string;
    toModel: string;
    affectedRequestPct: number;
    savingsUSD: number;
  }>;
};

// ---------------------------------------------------------------------------
// Execution payload / result
// ---------------------------------------------------------------------------

type ModelRoutingPayload = {
  tenantId: string;
  recommendations: ModelRoutingRecommendation[];
};

type ModelRoutingResult = {
  tenantId: string;
  executionId: string;
  routingRulesDescription: string[];
  estimatedMonthlySavings: number;
  verificationWindowDays: number;
};

// ---------------------------------------------------------------------------
// Deterministic mock evidence helper
// ---------------------------------------------------------------------------

function buildMockEvidence(tenantId: string): ModelRoutingEvidence {
  const seed = tenantId.length + tenantId.charCodeAt(0);

  const gpt4oCost = 380 + seed * 2.5;
  const o1Cost = 260 + seed * 2;
  const sonnetCost = 150 + seed * 1.5;
  const miniCost = 55 + seed;
  const totalCost = gpt4oCost + o1Cost + sonnetCost + miniCost;

  // Wasted cost: overqualified % of premium/reasoning models
  const wastedCost = Math.round(gpt4oCost * 0.42 + o1Cost * 0.55);

  return {
    tenantId,
    modelUsage: [
      {
        modelId: 'gpt-4o',
        vendor: 'openai',
        tier: 'PREMIUM',
        requestCount: 32_000 + seed * 25,
        avgComplexityBand: 'SIMPLE',
        monthlyCostUSD: gpt4oCost,
        overqualifiedPct: 42,
      },
      {
        modelId: 'o1-preview',
        vendor: 'openai',
        tier: 'REASONING',
        requestCount: 8_500 + seed * 8,
        avgComplexityBand: 'MODERATE',
        monthlyCostUSD: o1Cost,
        overqualifiedPct: 55,
      },
      {
        modelId: 'claude-3-5-sonnet-20241022',
        vendor: 'anthropic',
        tier: 'STANDARD',
        requestCount: 26_000 + seed * 20,
        avgComplexityBand: 'MODERATE',
        monthlyCostUSD: sonnetCost,
        overqualifiedPct: 18,
      },
      {
        modelId: 'gpt-4o-mini',
        vendor: 'openai',
        tier: 'ECONOMY',
        requestCount: 19_000 + seed * 15,
        avgComplexityBand: 'TRIVIAL',
        monthlyCostUSD: miniCost,
        overqualifiedPct: 6,
      },
    ],
    totalMonthlyCostUSD: totalCost,
    estimatedWastedCostUSD: wastedCost,
  };
}

// ---------------------------------------------------------------------------
// Pack definition
// ---------------------------------------------------------------------------

const definition: EconomicOperationsPackDefinition<
  ModelRoutingEvidence,
  ModelRoutingRecommendation,
  ModelRoutingSimulation,
  ModelRoutingPayload,
  ModelRoutingResult
> = {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: 'ai-model-routing',
  name: 'AI Model Routing Optimisation',
  version: '1.0.0',

  // ── Classification ────────────────────────────────────────────────────────
  domain: 'AI_GOVERNANCE',
  category: 'MODEL_ROUTING',
  description:
    'Analyses task complexity distributions across AI model usage and identifies over-qualification ' +
    'mismatches — premium or reasoning models handling TRIVIAL and SIMPLE tasks. Recommends ' +
    'task-classification-aware routing rules, mini-model downgrade paths, cache-first routing, ' +
    'and reasoning-gate policies to align model capability with actual task demand.',
  riskProfile: 'LOW',
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
      async collect(
        tenantId: string,
        _context: Record<string, unknown>,
      ): Promise<ModelRoutingEvidence> {
        return buildMockEvidence(tenantId);
      },
    },
    normalizer: {
      normalize(raw: unknown): ModelRoutingEvidence {
        return raw as ModelRoutingEvidence;
      },
    },
    trustScorer: {
      minimumTrustThreshold: 0.6,
      score(evidence: ModelRoutingEvidence): number {
        // Higher trust when we have diverse model breakdown (>2 models)
        // and estimated wasted cost is a meaningful share of total
        let score = 0.90;
        const wastedPct = evidence.estimatedWastedCostUSD / evidence.totalMonthlyCostUSD;
        if (wastedPct < 0.1) {
          // Low wasted cost — evidence may not contain actionable signals
          score -= 0.15;
        }
        if (evidence.modelUsage.length < 2) {
          score -= 0.15;
        }
        return Math.max(0.6, Math.min(0.90, score));
      },
    },
    savingsEstimator: {
      estimateMonthlySavings(evidence: ModelRoutingEvidence): number {
        // Savings from routing overqualified requests to cheaper models
        const overqualifiedWaste = evidence.modelUsage
          .filter((m) => m.tier === 'PREMIUM' || m.tier === 'REASONING')
          .reduce((sum, m) => sum + m.monthlyCostUSD * (m.overqualifiedPct / 100), 0);
        // Routing to mini yields ~70% savings on those requests
        return Math.round(overqualifiedWaste * 0.7);
      },
      estimateAnnualSavings(evidence: ModelRoutingEvidence): number {
        return this.estimateMonthlySavings(evidence) * 12;
      },
      confidence(evidence: ModelRoutingEvidence): number {
        const highOverqualified = evidence.modelUsage.filter((m) => m.overqualifiedPct > 30);
        return highOverqualified.length >= 2 ? 0.88 : 0.68;
      },
    },
  },

  // ── Recommendation layer ──────────────────────────────────────────────────
  recommendationLayer: {
    maxRecommendations: 4,
    generator: {
      async generate(
        _tenantId: string,
        evidence: ModelRoutingEvidence,
      ): Promise<ModelRoutingRecommendation[]> {
        const recommendations: ModelRoutingRecommendation[] = [];

        for (const model of evidence.modelUsage) {
          const overqualifiedRequests = Math.round(
            model.requestCount * (model.overqualifiedPct / 100),
          );
          const overqualifiedCost = model.monthlyCostUSD * (model.overqualifiedPct / 100);

          // DOWNGRADE_TO_MINI — premium model used for TRIVIAL or SIMPLE tasks
          if (
            (model.tier === 'PREMIUM' || model.tier === 'STANDARD') &&
            (model.avgComplexityBand === 'TRIVIAL' || model.avgComplexityBand === 'SIMPLE') &&
            model.overqualifiedPct > 30
          ) {
            const savingsPct = 68;
            const savings = Math.round(overqualifiedCost * (savingsPct / 100));
            recommendations.push({
              recommendationType: 'DOWNGRADE_TO_MINI',
              fromModelId: model.modelId,
              toModelId: model.vendor === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku-20240307',
              affectedRequestCount: overqualifiedRequests,
              currentMonthlyCostUSD: Math.round(overqualifiedCost),
              projectedMonthlyCostUSD: Math.round(overqualifiedCost - savings),
              projectedMonthlySavings: savings,
              savingsPct,
              confidence: 0.85,
              rationale:
                `${model.overqualifiedPct}% of "${model.modelId}" requests have average complexity band ` +
                `"${model.avgComplexityBand}" — a ${model.tier} model is over-qualified for these tasks. ` +
                `Routing those ${overqualifiedRequests.toLocaleString()} requests/month to the mini-tier ` +
                'equivalent preserves output quality while capturing ~68% cost reduction on that slice.',
              executionRisk: 'LOW',
            });
          }

          // REASONING_ONLY_WHEN_REQUIRED — reasoning model used for non-COMPLEX/EXPERT tasks
          if (
            model.tier === 'REASONING' &&
            model.avgComplexityBand !== 'COMPLEX' &&
            model.avgComplexityBand !== 'EXPERT' &&
            model.overqualifiedPct > 40
          ) {
            const savings = Math.round(overqualifiedCost * 0.75);
            recommendations.push({
              recommendationType: 'REASONING_ONLY_WHEN_REQUIRED',
              fromModelId: model.modelId,
              toModelId: 'gpt-4o',
              affectedRequestCount: overqualifiedRequests,
              currentMonthlyCostUSD: Math.round(overqualifiedCost),
              projectedMonthlyCostUSD: Math.round(overqualifiedCost - savings),
              projectedMonthlySavings: savings,
              savingsPct: 75,
              confidence: 0.80,
              rationale:
                `Reasoning model "${model.modelId}" is handling tasks at "${model.avgComplexityBand}" complexity ` +
                `(${model.overqualifiedPct}% overqualified). Reasoning-extended inference is only necessary for ` +
                'COMPLEX and EXPERT tasks. Gating reasoning-mode behind a complexity classifier eliminates ' +
                'the reasoning premium on tasks that do not benefit from chain-of-thought.',
              executionRisk: 'LOW',
            });
          }
        }

        // TASK_CLASSIFICATION_ROUTING — if no economy-tier is used at all, complexity routing likely absent
        const hasEconomyTier = evidence.modelUsage.some((m) => m.tier === 'ECONOMY');
        if (!hasEconomyTier) {
          const totalSavings = Math.round(evidence.totalMonthlyCostUSD * 0.25);
          recommendations.push({
            recommendationType: 'TASK_CLASSIFICATION_ROUTING',
            fromModelId: 'all',
            toModelId: 'auto-classified',
            affectedRequestCount: evidence.modelUsage.reduce((s, m) => s + m.requestCount, 0),
            currentMonthlyCostUSD: Math.round(evidence.totalMonthlyCostUSD),
            projectedMonthlyCostUSD: Math.round(evidence.totalMonthlyCostUSD - totalSavings),
            projectedMonthlySavings: totalSavings,
            savingsPct: 25,
            confidence: 0.72,
            rationale:
              'No economy-tier model usage detected, indicating task complexity classification is absent. ' +
              'Introducing a lightweight prompt-complexity classifier (e.g. rule-based or small classifier model) ' +
              'as a routing pre-filter would automatically direct TRIVIAL and SIMPLE requests to economy models, ' +
              'projecting ~25% total AI cost reduction without quality regression.',
            executionRisk: 'LOW',
          });
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
        evidence: ModelRoutingEvidence,
      ): Promise<ModelRoutingSimulation> {
        const routingChanges: ModelRoutingSimulation['routingChanges'] = [];
        let totalSavings = 0;

        for (const model of evidence.modelUsage) {
          if (
            (model.tier === 'PREMIUM' || model.tier === 'REASONING') &&
            model.overqualifiedPct > 30
          ) {
            const overqualifiedCost = model.monthlyCostUSD * (model.overqualifiedPct / 100);
            const savings = Math.round(overqualifiedCost * 0.68);
            totalSavings += savings;
            routingChanges.push({
              fromModel: model.modelId,
              toModel: model.tier === 'REASONING' ? 'gpt-4o' : 'gpt-4o-mini',
              affectedRequestPct: model.overqualifiedPct,
              savingsUSD: savings,
            });
          }
        }

        return {
          tenantId,
          executionId,
          projectedRoutingRulesAdded: routingChanges.length,
          projectedMonthlySavingsUSD: totalSavings,
          projectedMonthlyCostUSD: Math.round(evidence.totalMonthlyCostUSD - totalSavings),
          routingChanges,
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
        payload: ModelRoutingPayload,
      ): Promise<ModelRoutingResult> {
        const descriptions = payload.recommendations.map(
          (r) =>
            `${r.recommendationType}: route ${r.fromModelId} → ${r.toModelId} ` +
            `for ${r.affectedRequestCount.toLocaleString()} requests/month ` +
            `(projected saving: $${r.projectedMonthlySavings}/mo)`,
        );
        const totalSavings = payload.recommendations.reduce(
          (sum, r) => sum + r.projectedMonthlySavings,
          0,
        );
        return {
          tenantId,
          executionId,
          routingRulesDescription: descriptions,
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
      return { ready: true, blockers: [] };
    },
  },

  // ── Verification layer ────────────────────────────────────────────────────
  verificationLayer: {
    strategy: {
      async verify(
        tenantId: string,
        executionId: string,
        expected: ModelRoutingResult,
      ): Promise<{ verified: boolean; confidence: number; details: Record<string, unknown> }> {
        return {
          verified: false,
          confidence: 0.0,
          details: {
            tenantId,
            executionId,
            verificationNote:
              'Re-collect model usage evidence after 30 days. Compare model tier distribution ' +
              'and per-model cost share against pre-execution baseline to confirm routing rules are active.',
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
        ruleId: 'PREMIUM_TIER_CREEP',
        description:
          'Detects when premium or reasoning model share of total requests climbs back above 50% ' +
          'after routing rules were applied, indicating rules have been bypassed or removed.',
        severity: 'HIGH',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const premiumRequestPct =
            typeof context['premiumTierRequestPct'] === 'number'
              ? context['premiumTierRequestPct']
              : 0;
          const triggered = premiumRequestPct > 50;
          return {
            triggered,
            detail: triggered
              ? `Premium/reasoning models now handle ${premiumRequestPct}% of requests for tenant ${tenantId} ` +
                `(executionId: ${executionId}). Routing rules may be inactive or overridden.`
              : `Premium model request share is ${premiumRequestPct}% — within post-routing bounds.`,
          };
        },
      },
      {
        ruleId: 'OVERQUALIFICATION_REBOUND',
        description:
          'Detects when the aggregate overqualified request percentage (across all models) rebounds ' +
          'above 35% after a routing intervention.',
        severity: 'MEDIUM',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const overqualifiedPct =
            typeof context['aggregateOverqualifiedPct'] === 'number'
              ? context['aggregateOverqualifiedPct']
              : 0;
          const triggered = overqualifiedPct > 35;
          return {
            triggered,
            detail: triggered
              ? `Aggregate overqualified request rate is ${overqualifiedPct}% for tenant ${tenantId} ` +
                `(executionId: ${executionId}), exceeding the 35% rebound threshold.`
              : `Overqualification rate is ${overqualifiedPct}% — within acceptable bounds.`,
          };
        },
      },
    ],
  },

  // ── UX ────────────────────────────────────────────────────────────────────
  ux: {
    displayName: 'AI Model Routing Optimisation',
    shortDescription: 'Route AI tasks to right-sized models and eliminate premium tier overuse.',
    longDescription:
      'The AI Model Routing Optimisation pack evaluates your current AI model usage against task ' +
      'complexity distributions to identify systematic over-qualification: premium and reasoning models ' +
      'handling TRIVIAL and SIMPLE workloads that economy-tier models could serve equally well. ' +
      'It generates routing recommendations — mini-model downgrade paths, task complexity classifiers, ' +
      'cache-first routing gates, and reasoning-model guards — backed by per-model cost and request data. ' +
      'Simulation quantifies projected monthly savings before any configuration change is made; ' +
      'drift detection alerts when premium tier creep or overqualification rebounds post-intervention.',
    iconSlug: 'model-routing',
    domainColour: 'indigo-600',
    estimatedTimeToValueDays: 10,
    documentationUrl: null,
    tags: [
      'ai',
      'model-routing',
      'cost-reduction',
      'task-classification',
      'premium-tier',
      'governance',
    ],
    requiredFeatureFlags: ['ai_governance_enabled'],
  },
};

// ---------------------------------------------------------------------------
// Compile and export
// ---------------------------------------------------------------------------

export const aiModelRoutingPack = compileEconomicOperationsPack(definition);

// Register with the global registry at module initialisation time.
globalPackRegistry.register(aiModelRoutingPack);
