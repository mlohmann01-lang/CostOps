/**
 * ai-context-governance-pack.ts
 *
 * AI Context Governance pack for the Economic Operations platform.
 * Governs AI context window usage: retrieval chunk sizing, vector collection
 * health, embedding duplication, and per-user memory footprint — recommending
 * compression, archival, pruning, and consolidation interventions.
 */

import { compileEconomicOperationsPack } from '../../economic-operations-pack-factory.js';
import type { EconomicOperationsPackDefinition } from '../../economic-operations-pack-types.js';
import { globalPackRegistry } from '../../economic-operations-pack-registry.js';

// ---------------------------------------------------------------------------
// Evidence type
// ---------------------------------------------------------------------------

type ContextGovernanceEvidence = {
  tenantId: string;
  avgContextTokens: number;
  peakContextTokens: number;
  systemPromptTokens: number;
  retrievalChunkTokens: number;
  retrievalChunkCount: number;
  totalVectorCollections: number;
  staleCollections: number;       // no queries in 30+ days
  duplicateEmbeddingPct: number;  // estimated duplication
  memoryTokensPerUser: number;
  monthlyCostUSD: number;
  estimatedOptimizablePct: number;
};

// ---------------------------------------------------------------------------
// Recommendation type
// ---------------------------------------------------------------------------

type ContextGovernanceRecommendation = {
  recommendationType:
    | 'CONTEXT_COMPRESSION'
    | 'MEMORY_ARCHIVE'
    | 'VECTOR_PRUNING'
    | 'RETRIEVAL_LIMIT'
    | 'EMBEDDING_CONSOLIDATION';
  rationale: string;
  projectedMonthlySavingsUSD: number;
  confidence: number;
  executionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
};

// ---------------------------------------------------------------------------
// Execution payload / result
// ---------------------------------------------------------------------------

type ContextGovernancePayload = {
  tenantId: string;
  recommendations: ContextGovernanceRecommendation[];
};

type ContextGovernanceResult = {
  tenantId: string;
  executionId: string;
  appliedRecommendations: string[];
  estimatedMonthlySavingsUSD: number;
  verificationWindowDays: number;
};

// ---------------------------------------------------------------------------
// Deterministic mock evidence helper
// ---------------------------------------------------------------------------

function buildMockEvidence(tenantId: string): ContextGovernanceEvidence {
  const seed = tenantId.length + tenantId.charCodeAt(0);

  return {
    tenantId,
    avgContextTokens: 6_800 + seed * 12,
    peakContextTokens: 28_000 + seed * 50,
    systemPromptTokens: 1_200 + seed * 3,
    retrievalChunkTokens: 512 + (seed % 256),
    retrievalChunkCount: 18 + (seed % 8),
    totalVectorCollections: 14 + (seed % 6),
    staleCollections: 4 + (seed % 3),
    duplicateEmbeddingPct: 22 + (seed % 15),
    memoryTokensPerUser: 3_400 + seed * 5,
    monthlyCostUSD: 820 + seed * 4,
    estimatedOptimizablePct: 30 + (seed % 20),
  };
}

// ---------------------------------------------------------------------------
// Pack definition
// ---------------------------------------------------------------------------

const definition: EconomicOperationsPackDefinition<
  ContextGovernanceEvidence,
  ContextGovernanceRecommendation,
  null,
  ContextGovernancePayload,
  ContextGovernanceResult
> = {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: 'ai-context-governance',
  name: 'AI Context Governance',
  version: '1.0.0',

  // ── Classification ────────────────────────────────────────────────────────
  domain: 'AI_GOVERNANCE',
  category: 'CONTEXT_GOVERNANCE',
  description:
    'Governs AI context window consumption by auditing retrieval chunk sizing, vector collection ' +
    'health, embedding duplication, and per-user memory footprint. Recommends context compression, ' +
    'memory archival, vector pruning, retrieval limits, and embedding consolidation to reduce ' +
    'context-layer AI spend.',
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
    requiredPermissions: ['RECOMMENDATION_READ', 'SIMULATION_RUN', 'EXECUTION_REQUEST'],
    allowedIntentTypes: [
      'SIMULATE',
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
      async collect(
        tenantId: string,
        _context: Record<string, unknown>,
      ): Promise<ContextGovernanceEvidence> {
        return buildMockEvidence(tenantId);
      },
    },
    normalizer: {
      normalize(raw: unknown): ContextGovernanceEvidence {
        return raw as ContextGovernanceEvidence;
      },
    },
    trustScorer: {
      minimumTrustThreshold: 0.6,
      score(evidence: ContextGovernanceEvidence): number {
        // Deduct trust if stale collections are a large fraction of total
        let score = 0.9;
        const staleFraction =
          evidence.totalVectorCollections > 0
            ? evidence.staleCollections / evidence.totalVectorCollections
            : 0;
        if (staleFraction > 0.4) score -= 0.1;
        if (evidence.duplicateEmbeddingPct > 30) score -= 0.05;
        return Math.max(0.6, Math.min(0.9, score));
      },
    },
    savingsEstimator: {
      estimateMonthlySavings(evidence: ContextGovernanceEvidence): number {
        return Math.round(evidence.monthlyCostUSD * (evidence.estimatedOptimizablePct / 100));
      },
      estimateAnnualSavings(evidence: ContextGovernanceEvidence): number {
        return this.estimateMonthlySavings(evidence) * 12;
      },
      confidence(_evidence: ContextGovernanceEvidence): number {
        return 0.72;
      },
    },
  },

  // ── Recommendation layer ──────────────────────────────────────────────────
  recommendationLayer: {
    maxRecommendations: 5,
    generator: {
      async generate(
        _tenantId: string,
        evidence: ContextGovernanceEvidence,
      ): Promise<ContextGovernanceRecommendation[]> {
        const recs: ContextGovernanceRecommendation[] = [];

        // CONTEXT_COMPRESSION — avgContextTokens > 6000
        if (evidence.avgContextTokens > 6_000) {
          const savings = Math.round(evidence.monthlyCostUSD * 0.15);
          recs.push({
            recommendationType: 'CONTEXT_COMPRESSION',
            rationale:
              `Average context window is ${evidence.avgContextTokens.toLocaleString()} tokens. ` +
              'Applying sliding-window summarisation and dropping low-signal history segments ' +
              'can reduce average context by 25–35% with minimal quality impact.',
            projectedMonthlySavingsUSD: savings,
            confidence: 0.78,
            executionRisk: 'LOW',
          });
        }

        // MEMORY_ARCHIVE — memoryTokensPerUser > 3000
        if (evidence.memoryTokensPerUser > 3_000) {
          const savings = Math.round(evidence.monthlyCostUSD * 0.1);
          recs.push({
            recommendationType: 'MEMORY_ARCHIVE',
            rationale:
              `Per-user memory footprint averages ${evidence.memoryTokensPerUser.toLocaleString()} tokens. ` +
              'Archiving memory entries older than 90 days to cold storage reduces active context ' +
              'payload without discarding long-term context — retrievable on-demand.',
            projectedMonthlySavingsUSD: savings,
            confidence: 0.75,
            executionRisk: 'LOW',
          });
        }

        // VECTOR_PRUNING — stale collections present
        if (evidence.staleCollections > 0) {
          const savings = Math.round(
            evidence.monthlyCostUSD * 0.05 * (evidence.staleCollections / evidence.totalVectorCollections),
          );
          recs.push({
            recommendationType: 'VECTOR_PRUNING',
            rationale:
              `${evidence.staleCollections} of ${evidence.totalVectorCollections} vector collections ` +
              'have received no queries in 30+ days. Pruning or archiving these collections ' +
              'reduces embedding storage costs and improves retrieval index scan times.',
            projectedMonthlySavingsUSD: savings,
            confidence: 0.82,
            executionRisk: 'LOW',
          });
        }

        // RETRIEVAL_LIMIT — retrievalChunkCount > 20 or retrievalChunkTokens > 800
        if (evidence.retrievalChunkCount > 20 || evidence.retrievalChunkTokens > 800) {
          const savings = Math.round(evidence.monthlyCostUSD * 0.08);
          recs.push({
            recommendationType: 'RETRIEVAL_LIMIT',
            rationale:
              `Retrieval is injecting ${evidence.retrievalChunkCount} chunks at ` +
              `${evidence.retrievalChunkTokens} tokens each per query. ` +
              'Capping chunk count to 10 and reducing chunk size to 512 tokens ' +
              'reduces context payload while retaining top-ranked passages.',
            projectedMonthlySavingsUSD: savings,
            confidence: 0.7,
            executionRisk: 'LOW',
          });
        }

        // EMBEDDING_CONSOLIDATION — duplicateEmbeddingPct > 15
        if (evidence.duplicateEmbeddingPct > 15) {
          const savings = Math.round(
            evidence.monthlyCostUSD * (evidence.duplicateEmbeddingPct / 100) * 0.6,
          );
          recs.push({
            recommendationType: 'EMBEDDING_CONSOLIDATION',
            rationale:
              `An estimated ${evidence.duplicateEmbeddingPct}% of embeddings are duplicated across ` +
              'collections. Deduplicating and consolidating shared content into a single canonical ' +
              'collection eliminates redundant embedding compute and storage charges.',
            projectedMonthlySavingsUSD: savings,
            confidence: 0.68,
            executionRisk: 'LOW',
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
        payload: ContextGovernancePayload,
      ): Promise<ContextGovernanceResult> {
        const applied = payload.recommendations.map((r) => r.recommendationType);
        const totalSavings = payload.recommendations.reduce(
          (sum, r) => sum + r.projectedMonthlySavingsUSD,
          0,
        );
        return {
          tenantId,
          executionId,
          appliedRecommendations: applied,
          estimatedMonthlySavingsUSD: totalSavings,
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
        expected: ContextGovernanceResult,
      ): Promise<{ verified: boolean; confidence: number; details: Record<string, unknown> }> {
        return {
          verified: false,
          confidence: 0.0,
          details: {
            tenantId,
            executionId,
            verificationNote:
              'Re-collect context evidence after 30 days and compare avgContextTokens and ' +
              'monthlyCostUSD against pre-execution baseline snapshot.',
            expectedMonthlySavingsUSD: expected.estimatedMonthlySavingsUSD,
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
    displayName: 'AI Context Governance',
    shortDescription:
      'Reduce context-layer AI spend by compressing windows, pruning vectors, and archiving stale memory.',
    longDescription:
      'The AI Context Governance pack audits every layer of your AI context pipeline: average and peak ' +
      'context window sizes, retrieval chunk parameters, vector collection freshness, embedding duplication ' +
      'rates, and per-user memory footprints. It produces targeted recommendations — context compression ' +
      'via sliding-window summarisation, memory archival to cold storage, stale vector collection pruning, ' +
      'retrieval chunk limits, and embedding deduplication — enabling measurable reduction in context-related ' +
      'token spend without degrading model output quality.',
    iconSlug: 'context-governance',
    domainColour: 'violet-600',
    estimatedTimeToValueDays: 7,
    documentationUrl: null,
    tags: [
      'ai',
      'context',
      'governance',
      'vector',
      'embeddings',
      'memory',
      'retrieval',
      'cost-reduction',
    ],
    requiredFeatureFlags: ['ai_governance_enabled'],
  },
};

// ---------------------------------------------------------------------------
// Compile and export
// ---------------------------------------------------------------------------

export const aiContextGovernancePack = compileEconomicOperationsPack(definition);

// Register with the global registry at module initialisation time.
globalPackRegistry.register(aiContextGovernancePack);
