// Program EX3 — Capabilities 2-5: graph impact engine, weakest-dependency
// confidence, scenario narratives and portfolio view. Every impact count is
// read directly off the Technology Value Graph (X1/X2) plus Technology
// Economics (X3) and Technology Capital Allocation (X4) — this module never
// computes new economics or invents downstream business impact.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { technologyInvestmentService } from '../technology-investment-authority/technology-investment-service';
import { technologyEconomicsService } from '../technology-economics-authority/technology-economics-service';
import { technologyCapitalAllocationDecisionService } from '../technology-capital-allocation-authority/technology-capital-allocation-authority-service';
import type { TechnologyGraph } from '../technology-investment-authority/technology-investment-types';
import type {
  ScenarioAnalysis, ScenarioPortfolioEntry, ScenarioPortfolioView, ScenarioSubjectType, ScenarioType,
} from './scenario-planning-types';

const assetNodeId = (id: string) => `asset:${id}`;
const vendorNodeId = (id: string) => `vendor:${id}`;

function confidenceLevelFromScore(score: number): string {
  if (score >= 85) return 'VERIFIED';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

const CONFIDENCE_RANK: Record<string, number> = { LOW: 0, MODERATE: 1, HIGH: 2, VERIFIED: 3 };

function weakest(levels: string[]): string {
  return levels.reduce((w, l) => (CONFIDENCE_RANK[l] < CONFIDENCE_RANK[w] ? l : w), levels[0] ?? 'LOW');
}

/**
 * Capability 2: resolves a scenario subject (technology, AI system, vendor or
 * business capability) to the set of technology asset ids it directly
 * touches in the real graph — never an inferred or downstream set.
 */
function resolveImpactedAssetIds(graph: TechnologyGraph, subjectType: ScenarioSubjectType, subjectId: string): string[] {
  if (subjectType === 'TECHNOLOGY' || subjectType === 'AI') {
    const node = graph.nodes.find((n) => n.id === assetNodeId(subjectId));
    return node ? [subjectId] : [];
  }
  if (subjectType === 'VENDOR') {
    const vId = vendorNodeId(subjectId);
    return graph.edges.filter((e) => e.type === 'DEPENDS_ON' && e.to === vId).map((e) => e.from.replace(/^asset:/, ''));
  }
  // CAPABILITY: subjectId is the capability node id (e.g. "capability:customer-service").
  return graph.edges.filter((e) => e.type === 'SUPPORTS' && e.to === subjectId).map((e) => e.from.replace(/^asset:/, ''));
}

export class ScenarioPlanningService {
  /** Capability 2: graph impact engine — direct graph impacts only. */
  async analyzeScenario(tenantId: string, scenarioType: ScenarioType, subjectType: ScenarioSubjectType, subjectId: string): Promise<ScenarioAnalysis> {
    const graph = await technologyInvestmentService.getGraph(tenantId);
    const assetIds = resolveImpactedAssetIds(graph, subjectType, subjectId);
    const assetNodeIds = new Set(assetIds.map(assetNodeId));

    const capabilityIds = new Set(
      graph.edges.filter((e) => e.type === 'SUPPORTS' && assetNodeIds.has(e.from)).map((e) => e.to),
    );
    const objectiveIds = new Set(
      graph.edges.filter((e) => e.type === 'CONTRIBUTES_TO' && capabilityIds.has(e.from)).map((e) => e.to),
    );
    const outcomeIds = new Set(
      graph.edges.filter((e) => e.type === 'PRODUCES' && assetNodeIds.has(e.from)).map((e) => e.to),
    );
    const renewalIds = new Set(
      graph.edges.filter((e) => e.type === 'RENEWS' && assetNodeIds.has(e.to)).map((e) => e.from),
    );

    const recommendations = await Promise.all(assetIds.map((id) => technologyCapitalAllocationDecisionService.getAssetAllocation(tenantId, id)));
    const evidenceIds = [...new Set(graph.edges.filter((e) => e.type === 'EVIDENCED_BY' && assetNodeIds.has(e.from)).map((e) => e.to))];

    const metrics = await Promise.all(assetIds.map((id) => technologyEconomicsService.getAssetEconomics(tenantId, id)));
    const economicsConfidence = metrics.length > 0
      ? confidenceLevelFromScore(metrics.reduce((s, m) => s + m.confidenceScore, 0) / metrics.length)
      : 'LOW';
    const graphConfidence = graph.readiness === 'READY' ? 'VERIFIED' : graph.readiness === 'PARTIAL' ? 'MODERATE' : 'LOW';
    const evidenceConfidence = evidenceIds.length >= 2 ? 'HIGH' : evidenceIds.length === 1 ? 'MODERATE' : 'LOW';

    // Capability 3: confidence cannot exceed the weakest dependency.
    const confidence = assetIds.length === 0 ? 'LOW' : weakest([economicsConfidence, graphConfidence, evidenceConfidence]);

    const assumptions: string[] = [
      `Impact derived from ${assetIds.length} technology graph node(s) directly linked to this subject.`,
      'Only direct graph relationships were counted; no downstream business impact was inferred.',
    ];
    if (assetIds.length === 0) assumptions.push('No graph linkage exists for this subject; impact is reported as zero rather than estimated.');

    return {
      id: `scenario:${scenarioType}:${subjectType}:${subjectId}`,
      tenantId,
      scenarioType,
      subjectType,
      subjectId,
      impactedAssets: assetIds.length,
      impactedCapabilities: capabilityIds.size,
      impactedObjectives: objectiveIds.size,
      impactedOutcomes: outcomeIds.size,
      impactedRenewals: renewalIds.size,
      impactedRecommendations: recommendations.length,
      confidence,
      readiness: graph.readiness,
      assumptions,
      evidenceIds,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Capability 4: board-ready scenario narrative — references only computed counts. */
  async getNarrative(tenantId: string, scenarioType: ScenarioType, subjectType: ScenarioSubjectType, subjectId: string): Promise<{ analysis: ScenarioAnalysis; narrative: string }> {
    const analysis = await this.analyzeScenario(tenantId, scenarioType, subjectType, subjectId);
    const narrative = `${scenarioType === 'DO_NOTHING' ? 'Doing nothing for' : `${scenarioType} on`} ${subjectId} would affect:\n\n`
      + `${analysis.impactedCapabilities} business capabilities\n`
      + `${analysis.impactedOutcomes} linked outcomes\n`
      + `${analysis.impactedObjectives} business objectives\n\n`
      + `Graph completeness: ${analysis.readiness}\n`
      + `Confidence: ${analysis.confidence}`;
    return { analysis, narrative };
  }

  /** Capability 5: portfolio view of most-impactful scenarios per type, ranked by graph-derived impact score. */
  async getPortfolioView(tenantId: string): Promise<ScenarioPortfolioView> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);

    const scoreOf = (a: ScenarioAnalysis) => a.impactedCapabilities + a.impactedObjectives + a.impactedOutcomes + a.impactedRenewals;

    const buildEntries = async (scenarioType: ScenarioType): Promise<ScenarioPortfolioEntry[]> => {
      const entries = await Promise.all(portfolio.assets.map(async (asset) => {
        const analysis = await this.analyzeScenario(tenantId, scenarioType, 'TECHNOLOGY', asset.id);
        return { subjectId: asset.id, subjectType: 'TECHNOLOGY' as ScenarioSubjectType, scenarioType, impactScore: scoreOf(analysis), analysis };
      }));
      return entries.sort((a, b) => b.impactScore - a.impactScore).slice(0, 5);
    };

    const [mostImpactfulRetirements, mostImpactfulRenewals, mostImpactfulExpansions, mostImpactfulConsolidations] = await Promise.all([
      buildEntries('RETIRE'), buildEntries('RENEW'), buildEntries('EXPAND'), buildEntries('CONSOLIDATE'),
    ]);

    return {
      tenantId, mostImpactfulRetirements, mostImpactfulRenewals, mostImpactfulExpansions, mostImpactfulConsolidations,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const scenarioPlanningService = new ScenarioPlanningService();
