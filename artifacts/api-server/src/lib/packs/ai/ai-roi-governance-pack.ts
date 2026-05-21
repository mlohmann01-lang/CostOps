/**
 * ai-roi-governance-pack.ts
 *
 * AI ROI Governance pack for the Economic Operations platform.
 * Measures and governs the return on investment of AI spending by tracking
 * verified vs. claimed savings, productivity signals, spend attribution, and
 * cost-per-outcome ratios — recommending governance actions to establish
 * measurement discipline and surface real ROI.
 */

import { compileEconomicOperationsPack } from '../../economic-operations-pack-factory.js';
import type { EconomicOperationsPackDefinition } from '../../economic-operations-pack-types.js';
import { globalPackRegistry } from '../../economic-operations-pack-registry.js';

// ---------------------------------------------------------------------------
// Evidence type
// ---------------------------------------------------------------------------

type ProductivitySignal = {
  signalType: 'CODE_REVIEW_FASTER' | 'TICKET_RESOLUTION_FASTER' | 'AUTOMATION_RATE';
  measurement: number;
  unit: string;
  attributedToAI: boolean;
};

type AIROIEvidence = {
  tenantId: string;
  windowDays: number;
  totalAISpendUSD: number;
  verifiedSavingsUSD: number;          // savings with execution proof
  unverifiedSavingsUSD: number;        // claimed savings without proof
  productivitySignals: ProductivitySignal[];
  costPerOutcome: number | null;        // null if outcomes not tracked
  roiRatio: number | null;             // verifiedSavings / totalSpend
  spendByDomain: Record<string, number>;
  unattributedSpendUSD: number;
};

// ---------------------------------------------------------------------------
// Recommendation type
// ---------------------------------------------------------------------------

type AIROIRecommendation = {
  recommendationType:
    | 'ESTABLISH_OUTCOME_TRACKING'
    | 'VERIFY_CLAIMED_SAVINGS'
    | 'REALLOCATE_UNATTRIBUTED_SPEND'
    | 'ROI_GOVERNANCE_REPORT';
  rationale: string;
  projectedImpact: string;
  confidence: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
};

// ---------------------------------------------------------------------------
// Execution payload / result
// ---------------------------------------------------------------------------

type AIROIPayload = {
  tenantId: string;
  recommendations: AIROIRecommendation[];
};

type AIROIResult = {
  tenantId: string;
  executionId: string;
  appliedActions: string[];
  baselineReportGenerated: boolean;
  verificationWindowDays: number;
};

// ---------------------------------------------------------------------------
// Deterministic mock evidence helper
// ---------------------------------------------------------------------------

function buildMockEvidence(tenantId: string): AIROIEvidence {
  const seed = tenantId.length + tenantId.charCodeAt(0);

  const totalSpend = 8_400 + seed * 20;
  const verifiedSavings = 2_100 + seed * 5;
  const unverifiedSavings = 6_800 + seed * 10;
  const unattributed = 2_520 + seed * 6;

  return {
    tenantId,
    windowDays: 30,
    totalAISpendUSD: totalSpend,
    verifiedSavingsUSD: verifiedSavings,
    unverifiedSavingsUSD: unverifiedSavings,
    productivitySignals: [
      {
        signalType: 'CODE_REVIEW_FASTER',
        measurement: 22 + (seed % 10),
        unit: 'pct_time_reduction',
        attributedToAI: true,
      },
      {
        signalType: 'TICKET_RESOLUTION_FASTER',
        measurement: 14 + (seed % 8),
        unit: 'pct_time_reduction',
        attributedToAI: false,
      },
      {
        signalType: 'AUTOMATION_RATE',
        measurement: 31 + (seed % 12),
        unit: 'pct_tasks_automated',
        attributedToAI: true,
      },
    ],
    costPerOutcome: null,
    roiRatio: verifiedSavings / totalSpend,
    spendByDomain: {
      AI_GOVERNANCE: 3_200 + seed * 8,
      TOKEN_GOVERNANCE: 1_800 + seed * 4,
      AGENT_RUNTIME_GOVERNANCE: 900 + seed * 2,
      unattributed: unattributed,
    },
    unattributedSpendUSD: unattributed,
  };
}

// ---------------------------------------------------------------------------
// Pack definition
// ---------------------------------------------------------------------------

const definition: EconomicOperationsPackDefinition<
  AIROIEvidence,
  AIROIRecommendation,
  null,
  AIROIPayload,
  AIROIResult
> = {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: 'ai-roi-governance',
  name: 'AI ROI Governance',
  version: '1.0.0',

  // ── Classification ────────────────────────────────────────────────────────
  domain: 'AI_GOVERNANCE',
  category: 'ROI_GOVERNANCE',
  description:
    'Measures and governs the return on investment of AI spending by distinguishing verified savings ' +
    'from unverified claims, attributing spend to domains, computing cost-per-outcome ratios, and ' +
    'surfacing productivity signals. Recommends outcome tracking, savings verification, spend ' +
    'reallocation, and baseline ROI reporting to establish measurement discipline.',
  riskProfile: 'LOW',
  blastRadiusClassification: 'LOW',

  // ── Operational constraints ───────────────────────────────────────────────
  minimumTenantMode: 'PILOT_READ_ONLY',
  supportedExecutionModes: ['SIMULATION_ONLY', 'GOVERNED_EXECUTION'],
  requiredCapabilities: ['READ_COSTS', 'READ_ACTIVITY'],
  requiredConnectorScopes: [],
  defaultApprovalPolicy: 'SINGLE_APPROVER',

  // ── Feature flags ─────────────────────────────────────────────────────────
  supportsRollback: false,
  supportsVerification: true,
  supportsDriftDetection: false,
  supportsSimulation: false,

  // ── Governance ───────────────────────────────────────────────────────────
  governance: {
    minimumRolesForRecommendation: ['ECONOMIC_OPERATOR', 'ADMIN', 'OWNER'],
    minimumRolesForExecution: ['ADMIN', 'OWNER'],
    requiredPermissions: ['RECOMMENDATION_READ', 'EXECUTION_REQUEST'],
    allowedIntentTypes: [
      'REQUEST_APPROVAL',
      'APPROVE',
      'REJECT',
      'EXECUTE',
      'VERIFY',
    ],
  },

  // ── Evidence layer ────────────────────────────────────────────────────────
  evidenceLayer: {
    collector: {
      async collect(tenantId: string, _context: Record<string, unknown>): Promise<AIROIEvidence> {
        return buildMockEvidence(tenantId);
      },
    },
    normalizer: {
      normalize(raw: unknown): AIROIEvidence {
        return raw as AIROIEvidence;
      },
    },
    trustScorer: {
      minimumTrustThreshold: 0.5,
      score(evidence: AIROIEvidence): number {
        // Lower trust when costPerOutcome is null (outcomes not tracked)
        // and when unverified savings dominate
        let score = 0.85;
        if (evidence.costPerOutcome === null) score -= 0.15;
        const unverifiedRatio =
          evidence.verifiedSavingsUSD > 0
            ? evidence.unverifiedSavingsUSD / evidence.verifiedSavingsUSD
            : 2;
        if (unverifiedRatio > 2) score -= 0.1;
        return Math.max(0.5, Math.min(0.85, score));
      },
    },
    savingsEstimator: {
      estimateMonthlySavings(evidence: AIROIEvidence): number {
        // Governance uplift: closing the unverified gap captures 20% of claimed savings
        return Math.round(evidence.unverifiedSavingsUSD * 0.2);
      },
      estimateAnnualSavings(evidence: AIROIEvidence): number {
        return this.estimateMonthlySavings(evidence) * 12;
      },
      confidence(evidence: AIROIEvidence): number {
        return evidence.costPerOutcome !== null ? 0.8 : 0.55;
      },
    },
  },

  // ── Recommendation layer ──────────────────────────────────────────────────
  recommendationLayer: {
    maxRecommendations: 4,
    generator: {
      async generate(
        _tenantId: string,
        evidence: AIROIEvidence,
      ): Promise<AIROIRecommendation[]> {
        const recs: AIROIRecommendation[] = [];

        // ESTABLISH_OUTCOME_TRACKING — when costPerOutcome is null
        if (evidence.costPerOutcome === null) {
          recs.push({
            recommendationType: 'ESTABLISH_OUTCOME_TRACKING',
            rationale:
              'No cost-per-outcome metric is currently tracked. Without outcome attribution, ' +
              'AI spend cannot be correlated with business value — making ROI claims unverifiable. ' +
              'Instrument workflows with outcome events (tickets resolved, PRs merged, automations triggered) ' +
              'and join them with spend records to compute real cost-per-outcome.',
            projectedImpact:
              'Establishes the measurement foundation required for verified ROI claims and spend reallocation.',
            confidence: 0.9,
            priority: 'HIGH',
          });
        }

        // VERIFY_CLAIMED_SAVINGS — when unverified > verified * 2
        if (evidence.unverifiedSavingsUSD > evidence.verifiedSavingsUSD * 2) {
          const excess = Math.round(evidence.unverifiedSavingsUSD - evidence.verifiedSavingsUSD * 2);
          recs.push({
            recommendationType: 'VERIFY_CLAIMED_SAVINGS',
            rationale:
              `Unverified savings (USD ${evidence.unverifiedSavingsUSD.toLocaleString()}) exceed ` +
              `verified savings (USD ${evidence.verifiedSavingsUSD.toLocaleString()}) by more than 2×. ` +
              `USD ${excess.toLocaleString()} in savings claims lack execution proof. ` +
              'Audit claimed savings against execution ledger entries and discard claims without proof references.',
            projectedImpact:
              'Reduces overstated ROI figures and surfaces which savings programmes are genuinely effective.',
            confidence: 0.82,
            priority: 'HIGH',
          });
        }

        // REALLOCATE_UNATTRIBUTED_SPEND — when unattributed > 30% of total
        const unattributedPct = (evidence.unattributedSpendUSD / evidence.totalAISpendUSD) * 100;
        if (unattributedPct > 30) {
          recs.push({
            recommendationType: 'REALLOCATE_UNATTRIBUTED_SPEND',
            rationale:
              `${Math.round(unattributedPct)}% of AI spend (USD ${evidence.unattributedSpendUSD.toLocaleString()}) ` +
              'is unattributed to any domain or workflow. Unattributed spend cannot be governed or optimised. ' +
              'Tag all API requests with domain, workflow, and cost-centre identifiers at the SDK layer ' +
              'so spend can be routed to the correct budget owners.',
            projectedImpact:
              'Makes the full spend portfolio governable; enables per-domain ROI measurement.',
            confidence: 0.77,
            priority: 'MEDIUM',
          });
        }

        // ROI_GOVERNANCE_REPORT — always generate a baseline report
        const roiDisplay =
          evidence.roiRatio !== null
            ? `${(evidence.roiRatio * 100).toFixed(1)}%`
            : 'unknown (outcomes not tracked)';
        recs.push({
          recommendationType: 'ROI_GOVERNANCE_REPORT',
          rationale:
            `Current verified ROI ratio: ${roiDisplay}. ` +
            `Total AI spend over ${evidence.windowDays} days: USD ${evidence.totalAISpendUSD.toLocaleString()}. ` +
            `Verified savings: USD ${evidence.verifiedSavingsUSD.toLocaleString()}. ` +
            'A baseline governance report captures the current state for trend comparison in future cycles.',
          projectedImpact:
            'Creates the baseline measurement record required to track ROI improvement over time.',
          confidence: 1.0,
          priority: 'LOW',
        });

        return recs;
      },
    },
  },

  // ── Simulation layer (not supported — ROI governance is measurement, not mutation) ──
  simulationLayer: null,

  // ── Execution layer ───────────────────────────────────────────────────────
  executionLayer: {
    adapter: {
      async execute(
        tenantId: string,
        executionId: string,
        payload: AIROIPayload,
      ): Promise<AIROIResult> {
        const applied = payload.recommendations.map((r) => r.recommendationType);
        const hasReport = payload.recommendations.some(
          (r) => r.recommendationType === 'ROI_GOVERNANCE_REPORT',
        );
        return {
          tenantId,
          executionId,
          appliedActions: applied,
          baselineReportGenerated: hasReport,
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
        expected: AIROIResult,
      ): Promise<{ verified: boolean; confidence: number; details: Record<string, unknown> }> {
        // Verification checks whether verifiedSavingsUSD increased after governance actions.
        // In this implementation we return a structured description of what to check.
        return {
          verified: false,
          confidence: 0.0,
          details: {
            tenantId,
            executionId,
            verificationNote:
              'After 30 days, re-collect AIROIEvidence and compare verifiedSavingsUSD against ' +
              'the pre-execution baseline. Verified if verifiedSavingsUSD increased by at least 10%.',
            verificationWindowDays: expected.verificationWindowDays,
            baselineReportGenerated: expected.baselineReportGenerated,
            status: 'PENDING_WINDOW_COMPLETION',
          },
        };
      },
    },
  },

  // ── Drift layer (not supported) ───────────────────────────────────────────
  driftLayer: null,

  // ── UX ────────────────────────────────────────────────────────────────────
  ux: {
    displayName: 'AI ROI Governance',
    shortDescription:
      'Establish verified ROI measurement for AI spend — from productivity signals to cost-per-outcome ratios.',
    longDescription:
      'The AI ROI Governance pack audits the return on investment of your organisation\'s AI spend by ' +
      'distinguishing verified savings (backed by execution proof) from claimed savings, computing ' +
      'cost-per-outcome ratios where outcomes are tracked, and surfacing productivity signals such as ' +
      'code review cycle time, ticket resolution speed, and automation rates. It recommends establishing ' +
      'outcome tracking instrumentation, verifying claimed savings against the execution ledger, reallocating ' +
      'unattributed spend to governable domains, and generating a baseline ROI governance report for trend ' +
      'comparison over time.',
    iconSlug: 'roi-governance',
    domainColour: 'emerald-600',
    estimatedTimeToValueDays: 14,
    documentationUrl: null,
    tags: [
      'ai',
      'roi',
      'governance',
      'savings-verification',
      'outcome-tracking',
      'spend-attribution',
      'productivity',
    ],
    requiredFeatureFlags: ['ai_governance_enabled'],
  },
};

// ---------------------------------------------------------------------------
// Compile and export
// ---------------------------------------------------------------------------

export const aiROIGovernancePack = compileEconomicOperationsPack(definition);

// Register with the global registry at module initialisation time.
globalPackRegistry.register(aiROIGovernancePack);
