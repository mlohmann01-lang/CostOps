// Program EX2 — Capabilities 1-7: deterministic decision mapping, weakest-
// dependency confidence, board-ready narratives, portfolio summary, decision
// queue, and proof pack integration. Reuses X4's Technology Capital
// Allocation recommendations and X3's Technology Economics — never rebuilds
// recommendation logic or economics.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { technologyInvestmentService } from '../technology-investment-authority/technology-investment-service';
import { technologyEconomicsService } from '../technology-economics-authority/technology-economics-service';
import { technologyCapitalAllocationDecisionService } from '../technology-capital-allocation-authority/technology-capital-allocation-authority-service';
import { ExecutiveProofPackService } from '../executive-proof-packs';
import type { TechnologyEconomicsMetric } from '../technology-economics-authority/technology-economics-types';
import type { TechnologyCapitalAllocationRecommendation } from '../technology-capital-allocation-authority/technology-capital-allocation-authority-types';
import type {
  ExecutiveConfidence, ExecutiveDecisionOutput, ExecutiveDecisionRecord, ExecutiveDecisionSummary,
  ExecutiveDecisionQueueEntry, ExecutiveProofPackAvailability,
} from './executive-decision-authority-types';

const executiveProofPackService = new ExecutiveProofPackService();

const CONFIDENCE_RANK: Record<ExecutiveConfidence, number> = { LOW: 0, MODERATE: 1, HIGH: 2, VERIFIED: 3 };

function economicsConfidenceLevel(score: number): ExecutiveConfidence {
  if (score >= 85) return 'VERIFIED';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

function evidenceQualityLevel(evidenceCount: number): ExecutiveConfidence {
  if (evidenceCount >= 2) return 'HIGH';
  if (evidenceCount === 1) return 'MODERATE';
  return 'LOW';
}

function graphReadinessLevel(readiness: string): ExecutiveConfidence {
  if (readiness === 'READY') return 'VERIFIED';
  if (readiness === 'PARTIAL') return 'MODERATE';
  return 'LOW';
}

/**
 * EX2.3: executive confidence cannot exceed the weakest of its four
 * dependencies — Economics Confidence, Allocation Confidence, Evidence
 * Quality, and Graph Readiness.
 */
function executiveConfidence(
  metric: TechnologyEconomicsMetric,
  recommendation: TechnologyCapitalAllocationRecommendation,
  graphReadiness: string,
): ExecutiveConfidence {
  const levels: ExecutiveConfidence[] = [
    economicsConfidenceLevel(metric.confidenceScore),
    recommendation.confidenceLevel,
    evidenceQualityLevel(metric.evidenceCount),
    graphReadinessLevel(graphReadiness),
  ];
  return levels.reduce((weakest, l) => (CONFIDENCE_RANK[l] < CONFIDENCE_RANK[weakest] ? l : weakest));
}

/**
 * EX2.2: deterministic decision mapping framework. RETIRE, EXPAND, RENEW,
 * OPTIMISE and CONSOLIDATE map directly onto their executive approval —
 * X4 only reaches these when real evidence already backs the recommendation
 * (RETIRE itself is grounded in the absence of measurable value, which is
 * evidence in its own right). REVIEW is split into two executive outcomes:
 * when the underlying technology has zero outcomes and zero evidence (no
 * facts exist to review at all), the executive decision is
 * INSUFFICIENT_EVIDENCE rather than REQUIRE_REVIEW, since a reviewer would
 * have nothing to evaluate. A technology recommended KEEP requires no
 * executive action and so maps to no canonical ExecutiveDecisionOutput — it
 * is surfaced only in the decision queue (EX2.6), never in the
 * decision/summary set (EX2.1/EX2.5).
 */
function mapDecision(
  recommendation: TechnologyCapitalAllocationRecommendation,
  metric: TechnologyEconomicsMetric,
): ExecutiveDecisionOutput | undefined {
  switch (recommendation.decision) {
    case 'EXPAND': return 'APPROVE_EXPANSION';
    case 'RENEW': return 'APPROVE_RENEWAL';
    case 'OPTIMISE': return 'APPROVE_OPTIMISATION';
    case 'CONSOLIDATE': return 'APPROVE_CONSOLIDATION';
    case 'RETIRE': return 'APPROVE_RETIREMENT';
    case 'REVIEW': return metric.outcomeCount === 0 && metric.evidenceCount === 0 ? 'INSUFFICIENT_EVIDENCE' : 'REQUIRE_REVIEW';
    case 'KEEP': default: return undefined;
  }
}

function buildEvidenceSentence(decision: ExecutiveDecisionOutput, recommendation: TechnologyCapitalAllocationRecommendation): string {
  const facts = recommendation.rationale.join(', ');
  return `${facts}, ${decision.replace('APPROVE_', '').replace('_', ' ').toLowerCase()} recommendation ${recommendation.confidenceLevel} confidence`;
}

async function proofPackAvailability(tenantId: string): Promise<ExecutiveProofPackAvailability> {
  const summary = await executiveProofPackService.summariseTenantProofPacks(tenantId);
  return {
    packCount: summary.packCount,
    readyCount: summary.readyCount,
    averageReadinessScore: summary.averageReadinessScore,
    available: summary.packCount > 0,
  };
}

export class ExecutiveDecisionAuthorityService {
  /** EX2.1/EX2.2/EX2.3/EX2.4/EX2.7: a single technology's executive decision, or undefined when no executive action is needed (KEEP). */
  async getAssetDecision(tenantId: string, assetId: string): Promise<ExecutiveDecisionRecord | undefined> {
    const asset = await technologyPortfolioAuthorityService.summariseAsset(tenantId, assetId);
    const metric = await technologyEconomicsService.getAssetEconomics(tenantId, assetId);
    const recommendation = await technologyCapitalAllocationDecisionService.getAssetAllocation(tenantId, assetId);
    const graph = await technologyInvestmentService.getGraph(tenantId);

    const decision = mapDecision(recommendation, metric);
    if (!decision) return undefined;

    const confidence = executiveConfidence(metric, recommendation, graph.readiness);
    const proofPack = await proofPackAvailability(tenantId);
    const assetName = asset?.name ?? assetId;
    const evidenceSentence = buildEvidenceSentence(decision, recommendation);

    const narrative = `Recommendation: ${decision}\nTechnology: ${assetName}\nEvidence: ${evidenceSentence}.\nExecutive Confidence: ${confidence}`;

    return {
      id: `exec-decision:${assetId}`,
      tenantId,
      assetId,
      assetName,
      decision,
      executiveConfidence: confidence,
      evidence: recommendation.rationale,
      supportingFindings: [`economics readiness ${metric.readiness}`, `technology graph completeness ${graph.completenessScore}%`],
      supportingRecommendations: [recommendation.id],
      proofPackAvailability: proofPack,
      narrative,
      generatedAt: new Date().toISOString(),
    };
  }

  /** All executive decisions for the tenant's portfolio (KEEP technologies are excluded — they require no decision). */
  async getAllDecisions(tenantId: string): Promise<ExecutiveDecisionRecord[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const decisions = await Promise.all(portfolio.assets.map((a) => this.getAssetDecision(tenantId, a.id)));
    return decisions.filter((d): d is ExecutiveDecisionRecord => d !== undefined);
  }

  /** EX2.5: portfolio-level decision summary — 7 canonical counts. */
  async getSummary(tenantId: string): Promise<ExecutiveDecisionSummary> {
    const decisions = await this.getAllDecisions(tenantId);
    const count = (d: ExecutiveDecisionOutput) => decisions.filter((x) => x.decision === d).length;
    const averageExecutiveConfidence = decisions.length > 0
      ? decisions.reduce((s, d) => s + CONFIDENCE_RANK[d.executiveConfidence], 0) / decisions.length : 0;

    return {
      tenantId,
      totalTechnologies: decisions.length,
      approveExpansionCount: count('APPROVE_EXPANSION'),
      approveRenewalCount: count('APPROVE_RENEWAL'),
      approveOptimisationCount: count('APPROVE_OPTIMISATION'),
      approveConsolidationCount: count('APPROVE_CONSOLIDATION'),
      approveRetirementCount: count('APPROVE_RETIREMENT'),
      requireReviewCount: count('REQUIRE_REVIEW'),
      insufficientEvidenceCount: count('INSUFFICIENT_EVIDENCE'),
      averageExecutiveConfidence,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * EX2.6: executive action queue, priority order highest-first:
   * APPROVE_RETIREMENT, APPROVE_OPTIMISATION, APPROVE_CONSOLIDATION,
   * APPROVE_RENEWAL, APPROVE_EXPANSION, REQUIRE_REVIEW, KEEP. The spec's
   * 7-entry priority list swaps in KEEP for INSUFFICIENT_EVIDENCE relative to
   * EX2.1's canonical decision set. Judgment call: INSUFFICIENT_EVIDENCE is
   * itself a form of required review (a technology cannot even be reviewed
   * properly without evidence), so it is placed immediately above
   * REQUIRE_REVIEW; KEEP — a technology needing no executive action — is the
   * lowest-priority, catch-all entry exactly as the spec's own list places it.
   */
  async getDecisionQueue(tenantId: string): Promise<ExecutiveDecisionQueueEntry[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const recommendations = await technologyCapitalAllocationDecisionService.getAllRecommendations(tenantId);
    const priorityOrder: string[] = [
      'APPROVE_RETIREMENT', 'APPROVE_OPTIMISATION', 'APPROVE_CONSOLIDATION',
      'APPROVE_RENEWAL', 'APPROVE_EXPANSION', 'INSUFFICIENT_EVIDENCE', 'REQUIRE_REVIEW', 'KEEP',
    ];

    const entries: ExecutiveDecisionQueueEntry[] = [];
    for (const rec of recommendations) {
      const metric = await technologyEconomicsService.getAssetEconomics(tenantId, rec.assetId);
      const decision = mapDecision(rec, metric) ?? 'KEEP';
      const asset = portfolio.assets.find((a) => a.id === rec.assetId);
      const confidence = asset ? economicsConfidenceLevel(metric.confidenceScore) : 'LOW';
      entries.push({
        priority: priorityOrder.indexOf(decision),
        decision,
        assetId: rec.assetId,
        confidence,
        rationale: rec.rationale,
      });
    }

    return entries.sort((a, b) => a.priority - b.priority);
  }
}

export const executiveDecisionAuthorityService = new ExecutiveDecisionAuthorityService();
