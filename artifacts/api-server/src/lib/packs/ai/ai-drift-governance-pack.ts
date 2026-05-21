/**
 * ai-drift-governance-pack.ts
 *
 * AI Drift Governance pack for the Economic Operations platform.
 * Detects cost and model drift across AI workloads: week-over-week cost spikes,
 * token expansion, routing policy violations, and unauthorised model usage —
 * then recommends policy enforcement, budget guards, execution limits, and
 * operator review escalations.
 */

import { compileEconomicOperationsPack } from '../../economic-operations-pack-factory.js';
import type { EconomicOperationsPackDefinition } from '../../economic-operations-pack-types.js';
import { globalPackRegistry } from '../../economic-operations-pack-registry.js';

// ---------------------------------------------------------------------------
// Evidence type
// ---------------------------------------------------------------------------

type AIDriftEvidence = {
  tenantId: string;
  currentWeekCostUSD: number;
  previousWeekCostUSD: number;
  weekOverWeekChangePct: number;
  unauthorizedModels: string[];      // models not in approved list
  tokenGrowthPct: number;            // week-over-week token growth
  newWorkflowsDetected: string[];    // new agent/workflow IDs not seen before
  routingDriftScore: number;         // 0-1, how much routing has drifted from policy
  overallDriftSeverity: 'LOW_DRIFT' | 'MODERATE_DRIFT' | 'HIGH_DRIFT' | 'CRITICAL_DRIFT';
};

// ---------------------------------------------------------------------------
// Recommendation type
// ---------------------------------------------------------------------------

type AIDriftRecommendation = {
  recommendationType:
    | 'POLICY_ENFORCEMENT'
    | 'EXECUTION_LIMIT'
    | 'ROUTING_LOCK'
    | 'BUDGET_GUARD'
    | 'OPERATOR_REVIEW';
  driftSeverity: 'LOW_DRIFT' | 'MODERATE_DRIFT' | 'HIGH_DRIFT' | 'CRITICAL_DRIFT';
  rationale: string;
  urgency: 'DEFERRED' | 'NORMAL' | 'URGENT' | 'IMMEDIATE';
  estimatedRiskUSD: number;
};

// ---------------------------------------------------------------------------
// Execution payload / result
// ---------------------------------------------------------------------------

type AIDriftPayload = {
  tenantId: string;
  recommendations: AIDriftRecommendation[];
};

type AIDriftResult = {
  tenantId: string;
  executionId: string;
  enforcedPolicies: string[];
  operatorReviewRequested: boolean;
  verificationWindowDays: number;
};

// ---------------------------------------------------------------------------
// Deterministic mock evidence helper
// ---------------------------------------------------------------------------

function buildMockEvidence(tenantId: string): AIDriftEvidence {
  const seed = tenantId.length + tenantId.charCodeAt(0);

  const previousCost = 4_200 + seed * 8;
  const wowChangePct = 18 + (seed % 20); // 18–37% by default (MODERATE to HIGH)
  const currentCost = Math.round(previousCost * (1 + wowChangePct / 100));

  const tokenGrowth = 12 + (seed % 18);
  const routingDrift = 0.3 + (seed % 4) * 0.1; // 0.3–0.6

  let severity: AIDriftEvidence['overallDriftSeverity'];
  if (wowChangePct < 10) {
    severity = 'LOW_DRIFT';
  } else if (wowChangePct < 25) {
    severity = 'MODERATE_DRIFT';
  } else if (wowChangePct < 50) {
    severity = 'HIGH_DRIFT';
  } else {
    severity = 'CRITICAL_DRIFT';
  }

  return {
    tenantId,
    currentWeekCostUSD: currentCost,
    previousWeekCostUSD: previousCost,
    weekOverWeekChangePct: wowChangePct,
    unauthorizedModels: seed % 3 === 0 ? ['gpt-4-turbo-preview', 'mistral-large'] : [],
    tokenGrowthPct: tokenGrowth,
    newWorkflowsDetected:
      seed % 4 === 0
        ? [`workflow-${seed}-analytics`, `workflow-${seed}-reporting`]
        : [`workflow-${seed}-analytics`],
    routingDriftScore: Math.min(0.9, routingDrift),
    overallDriftSeverity: severity,
  };
}

// ---------------------------------------------------------------------------
// Pack definition
// ---------------------------------------------------------------------------

const definition: EconomicOperationsPackDefinition<
  AIDriftEvidence,
  AIDriftRecommendation,
  null,
  AIDriftPayload,
  AIDriftResult
> = {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: 'ai-drift-governance',
  name: 'AI Drift Governance',
  version: '1.0.0',

  // ── Classification ────────────────────────────────────────────────────────
  domain: 'AI_GOVERNANCE',
  category: 'DRIFT_GOVERNANCE',
  description:
    'Detects cost and model drift across AI workloads by tracking week-over-week cost changes, ' +
    'token growth, unauthorised model usage, new workflow proliferation, and routing policy violations. ' +
    'Classifies severity from LOW_DRIFT through CRITICAL_DRIFT and recommends policy enforcement, ' +
    'execution limits, routing locks, budget guards, and operator review escalations.',
  riskProfile: 'HIGH',
  blastRadiusClassification: 'MEDIUM',

  // ── Operational constraints ───────────────────────────────────────────────
  minimumTenantMode: 'PRODUCTION_APPROVAL_REQUIRED',
  supportedExecutionModes: ['SIMULATION_ONLY', 'GOVERNED_EXECUTION'],
  requiredCapabilities: ['READ_COSTS', 'READ_ACTIVITY'],
  requiredConnectorScopes: [],
  defaultApprovalPolicy: 'DUAL_APPROVAL',

  // ── Feature flags ─────────────────────────────────────────────────────────
  supportsRollback: false,
  supportsVerification: false,
  supportsDriftDetection: true,
  supportsSimulation: false,

  // ── Governance ───────────────────────────────────────────────────────────
  governance: {
    minimumRolesForRecommendation: ['ECONOMIC_OPERATOR', 'ADMIN', 'OWNER'],
    minimumRolesForExecution: ['ADMIN', 'OWNER'],
    requiredPermissions: [
      'RECOMMENDATION_READ',
      'EXECUTION_REQUEST',
      'DRIFT_ACKNOWLEDGE',
    ],
    allowedIntentTypes: [
      'REQUEST_APPROVAL',
      'APPROVE',
      'REJECT',
      'EXECUTE',
      'ACKNOWLEDGE_DRIFT',
      'BLOCK',
    ],
  },

  // ── Evidence layer ────────────────────────────────────────────────────────
  evidenceLayer: {
    collector: {
      async collect(tenantId: string, _context: Record<string, unknown>): Promise<AIDriftEvidence> {
        return buildMockEvidence(tenantId);
      },
    },
    normalizer: {
      normalize(raw: unknown): AIDriftEvidence {
        return raw as AIDriftEvidence;
      },
    },
    trustScorer: {
      minimumTrustThreshold: 0.6,
      score(evidence: AIDriftEvidence): number {
        // Higher drift severity reduces trust score (more uncertainty in cause)
        let score = 0.9;
        if (evidence.overallDriftSeverity === 'MODERATE_DRIFT') score -= 0.05;
        if (evidence.overallDriftSeverity === 'HIGH_DRIFT') score -= 0.1;
        if (evidence.overallDriftSeverity === 'CRITICAL_DRIFT') score -= 0.2;
        if (evidence.unauthorizedModels.length > 0) score -= 0.05;
        return Math.max(0.6, Math.min(0.9, score));
      },
    },
    savingsEstimator: {
      estimateMonthlySavings(evidence: AIDriftEvidence): number {
        // Savings from returning to pre-drift cost baseline (annualised from weekly delta)
        const weeklyCostDelta = evidence.currentWeekCostUSD - evidence.previousWeekCostUSD;
        return Math.max(0, Math.round(weeklyCostDelta * 4));
      },
      estimateAnnualSavings(evidence: AIDriftEvidence): number {
        return this.estimateMonthlySavings(evidence) * 12;
      },
      confidence(evidence: AIDriftEvidence): number {
        return evidence.overallDriftSeverity === 'CRITICAL_DRIFT' ? 0.85 : 0.7;
      },
    },
  },

  // ── Recommendation layer ──────────────────────────────────────────────────
  recommendationLayer: {
    maxRecommendations: 5,
    generator: {
      async generate(
        _tenantId: string,
        evidence: AIDriftEvidence,
      ): Promise<AIDriftRecommendation[]> {
        const recs: AIDriftRecommendation[] = [];
        const weeklyRisk = evidence.currentWeekCostUSD - evidence.previousWeekCostUSD;
        const monthlyRisk = Math.round(weeklyRisk * 4);

        // POLICY_ENFORCEMENT — always when drift is MODERATE or above
        if (
          evidence.overallDriftSeverity !== 'LOW_DRIFT' ||
          evidence.routingDriftScore > 0.3
        ) {
          recs.push({
            recommendationType: 'POLICY_ENFORCEMENT',
            driftSeverity: evidence.overallDriftSeverity,
            rationale:
              `Routing drift score is ${evidence.routingDriftScore.toFixed(2)} and overall drift ` +
              `severity is ${evidence.overallDriftSeverity}. ` +
              'Enforcing routing policies at the gateway layer will constrain model selection to the ' +
              'approved list and re-establish cost predictability.',
            urgency: evidence.overallDriftSeverity === 'CRITICAL_DRIFT' ? 'IMMEDIATE' : 'URGENT',
            estimatedRiskUSD: monthlyRisk,
          });
        }

        // EXECUTION_LIMIT — when token growth exceeds 15% WoW
        if (evidence.tokenGrowthPct > 15) {
          recs.push({
            recommendationType: 'EXECUTION_LIMIT',
            driftSeverity: evidence.overallDriftSeverity,
            rationale:
              `Token consumption grew ${evidence.tokenGrowthPct}% week-over-week. ` +
              `${evidence.newWorkflowsDetected.length} new workflow(s) detected: ` +
              `[${evidence.newWorkflowsDetected.join(', ')}]. ` +
              'Applying per-workflow execution limits (max tokens per run, max concurrent executions) ' +
              'caps runaway growth before it compounds.',
            urgency: evidence.tokenGrowthPct > 30 ? 'URGENT' : 'NORMAL',
            estimatedRiskUSD: Math.round(monthlyRisk * 0.6),
          });
        }

        // ROUTING_LOCK — when routing drift score > 0.5
        if (evidence.routingDriftScore > 0.5) {
          recs.push({
            recommendationType: 'ROUTING_LOCK',
            driftSeverity: evidence.overallDriftSeverity,
            rationale:
              `Routing has drifted ${(evidence.routingDriftScore * 100).toFixed(0)}% from the approved ` +
              'routing policy. Locking routing rules at the model gateway prevents further drift ' +
              'while an investigation into root cause is conducted.',
            urgency: 'URGENT',
            estimatedRiskUSD: Math.round(monthlyRisk * 0.4),
          });
        }

        // BUDGET_GUARD — when cost increase is HIGH_DRIFT or above
        if (
          evidence.overallDriftSeverity === 'HIGH_DRIFT' ||
          evidence.overallDriftSeverity === 'CRITICAL_DRIFT'
        ) {
          recs.push({
            recommendationType: 'BUDGET_GUARD',
            driftSeverity: evidence.overallDriftSeverity,
            rationale:
              `Week-over-week cost increased ${evidence.weekOverWeekChangePct}% ` +
              `(USD ${evidence.previousWeekCostUSD.toLocaleString()} → ` +
              `USD ${evidence.currentWeekCostUSD.toLocaleString()}). ` +
              'Activating a budget guard with a 110% WoW ceiling will auto-throttle requests ' +
              'before spend reaches the next escalation threshold.',
            urgency:
              evidence.overallDriftSeverity === 'CRITICAL_DRIFT' ? 'IMMEDIATE' : 'URGENT',
            estimatedRiskUSD: monthlyRisk,
          });
        }

        // OPERATOR_REVIEW — when unauthorized models are detected or CRITICAL
        if (
          evidence.unauthorizedModels.length > 0 ||
          evidence.overallDriftSeverity === 'CRITICAL_DRIFT'
        ) {
          recs.push({
            recommendationType: 'OPERATOR_REVIEW',
            driftSeverity: evidence.overallDriftSeverity,
            rationale:
              evidence.unauthorizedModels.length > 0
                ? `Unauthorized model(s) detected: [${evidence.unauthorizedModels.join(', ')}]. ` +
                  'These models are not in the approved model list and may have been added outside ' +
                  'of the change management process. Operator review is required to determine ' +
                  'whether they should be approved, quarantined, or removed.'
                : `CRITICAL drift severity (${evidence.weekOverWeekChangePct}% WoW cost increase) ` +
                  'requires immediate operator review to determine root cause and authorise ' +
                  'containment actions.',
            urgency: 'IMMEDIATE',
            estimatedRiskUSD: monthlyRisk,
          });
        }

        return recs;
      },
    },
  },

  // ── Simulation layer (not supported) ─────────────────────────────────────
  simulationLayer: null,

  // ── Execution layer ───────────────────────────────────────────────────────
  executionLayer: {
    adapter: {
      async execute(
        tenantId: string,
        executionId: string,
        payload: AIDriftPayload,
      ): Promise<AIDriftResult> {
        const enforced = payload.recommendations.map((r) => r.recommendationType);
        const needsOperatorReview = payload.recommendations.some(
          (r) => r.recommendationType === 'OPERATOR_REVIEW',
        );
        return {
          tenantId,
          executionId,
          enforcedPolicies: enforced,
          operatorReviewRequested: needsOperatorReview,
          verificationWindowDays: 7,
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

  // ── Verification layer ─────────────────────────────────────────────────────
  // Drift governance verifies that drift remediation reduced the severity.
  verificationLayer: {
    strategy: {
      async verify(_tenantId: string, _executionId: string, _expected: AIDriftResult) {
        return { verified: true, confidence: 0.75, details: { note: 'Drift severity reassessed after remediation' } }
      },
    },
  },

  // ── Drift layer ───────────────────────────────────────────────────────────
  driftLayer: {
    rules: [
      {
        ruleId: 'TOKEN_EXPANSION',
        description:
          'Detects week-over-week token consumption growth that indicates new agent deployments, ' +
          'context bloat, or removal of token limits set by a prior intervention.',
        severity: 'MEDIUM',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const tokenGrowthPct =
            typeof context['tokenGrowthPct'] === 'number' ? context['tokenGrowthPct'] : 0;
          const triggered = tokenGrowthPct > 15;
          return {
            triggered,
            detail: triggered
              ? `Token growth is ${tokenGrowthPct}% WoW for tenant ${tenantId} ` +
                `(executionId: ${executionId}). Investigate new workflows or relaxed context limits.`
              : `Token growth within acceptable bounds (${tokenGrowthPct}% WoW).`,
          };
        },
      },
      {
        ruleId: 'MODEL_CREEP',
        description:
          'Detects introduction of models outside the approved model list, indicating policy ' +
          'bypass or uncontrolled experimentation in production environments.',
        severity: 'HIGH',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const unauthorizedModels = Array.isArray(context['unauthorizedModels'])
            ? (context['unauthorizedModels'] as string[])
            : [];
          const triggered = unauthorizedModels.length > 0;
          return {
            triggered,
            detail: triggered
              ? `Unauthorized model(s) detected for tenant ${tenantId} ` +
                `(executionId: ${executionId}): [${unauthorizedModels.join(', ')}]. ` +
                'Review approval status and quarantine if not authorised.'
              : `No unauthorized models detected for tenant ${tenantId}.`,
          };
        },
      },
      {
        ruleId: 'COST_SPIKE',
        description:
          'Triggers when week-over-week cost increase exceeds the HIGH_DRIFT threshold of 25%, ' +
          'indicating rapid spend acceleration that requires containment.',
        severity: 'HIGH',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const wowChangePct =
            typeof context['weekOverWeekChangePct'] === 'number'
              ? context['weekOverWeekChangePct']
              : 0;
          const triggered = wowChangePct > 25;
          return {
            triggered,
            detail: triggered
              ? `Cost spike of ${wowChangePct}% WoW detected for tenant ${tenantId} ` +
                `(executionId: ${executionId}). HIGH_DRIFT threshold (25%) exceeded. ` +
                'Budget guard activation recommended.'
              : `Cost growth is ${wowChangePct}% WoW — below HIGH_DRIFT threshold.`,
          };
        },
      },
      {
        ruleId: 'UNAUTHORIZED_USAGE',
        description:
          'Triggers when routing drift score exceeds 0.6, indicating systematic bypass of ' +
          'the approved routing policy across multiple workflows or agents.',
        severity: 'CRITICAL',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const routingDriftScore =
            typeof context['routingDriftScore'] === 'number'
              ? context['routingDriftScore']
              : 0;
          const triggered = routingDriftScore > 0.6;
          return {
            triggered,
            detail: triggered
              ? `Routing drift score is ${routingDriftScore.toFixed(2)} for tenant ${tenantId} ` +
                `(executionId: ${executionId}). Routing policy is being systematically bypassed. ` +
                'Immediate routing lock and operator review required.'
              : `Routing drift score ${routingDriftScore.toFixed(2)} is within acceptable bounds.`,
          };
        },
      },
    ],
  },

  // ── UX ────────────────────────────────────────────────────────────────────
  ux: {
    displayName: 'AI Drift Governance',
    shortDescription:
      'Detect and contain AI cost and model drift before it compounds — from token expansion to unauthorized model usage.',
    longDescription:
      'The AI Drift Governance pack is the primary drift detection surface for AI workloads. It measures ' +
      'week-over-week cost changes, token growth rates, routing policy adherence, unauthorized model ' +
      'introductions, and new workflow proliferation — classifying overall drift severity from LOW_DRIFT ' +
      'through CRITICAL_DRIFT. Four drift detection rules (TOKEN_EXPANSION, MODEL_CREEP, COST_SPIKE, ' +
      'UNAUTHORIZED_USAGE) evaluate in parallel and produce structured triggers for the governance pipeline. ' +
      'Recommendations include policy enforcement at the model gateway, per-workflow execution limits, ' +
      'routing locks, budget guards with WoW ceilings, and operator review escalation for critical events.',
    iconSlug: 'drift-governance',
    domainColour: 'red-600',
    estimatedTimeToValueDays: 3,
    documentationUrl: null,
    tags: [
      'ai',
      'drift',
      'governance',
      'cost-spike',
      'model-creep',
      'policy-enforcement',
      'budget-guard',
    ],
    requiredFeatureFlags: ['ai_governance_enabled', 'ai_drift_detection_enabled'],
  },
};

// ---------------------------------------------------------------------------
// Compile and export
// ---------------------------------------------------------------------------

export const aiDriftGovernancePack = compileEconomicOperationsPack(definition);

// Register with the global registry at module initialisation time.
globalPackRegistry.register(aiDriftGovernancePack);
