// Program AI3 — Capability 3, 4, 5, 6 & 8: subgraphs, completeness scoring,
// and executive query helpers, layered on top of the Capability 2 builder.
// AI3 builds and explains the graph only — it never calculates AI economics.

import { aiInitiativePortfolioRepository } from '../ai-initiative-portfolio/ai-initiative-portfolio-repository';
import { aiValueAttributionRepository } from '../ai-value-attribution/ai-value-attribution-repository';
import { economicOutcomeAttributionService } from '../economic-outcomes/economic-outcome-attribution';
import { buildAIValueGraph } from './ai-value-graph-builder';
import type {
  AIValueGraph, AIValueGraphCompleteness, AIValueGraphGap, AIValueGraphNode, AIValueGraphEdge, AIValueGraphReadiness,
} from './ai-value-graph-types';

function readinessFromScore(score: number): AIValueGraphReadiness {
  if (score >= 90) return 'READY';
  if (score >= 60) return 'PARTIAL';
  return 'NOT_READY';
}

/**
 * Capability 6: completeness scoring. Inputs are ratios of provably linked
 * relationships out of the full tenant population — never inferred, only
 * counted from what the builder already proved with real edges.
 */
async function computeCompleteness(tenantId: string, gaps: AIValueGraphGap[]): Promise<AIValueGraphCompleteness> {
  const initiatives = await aiInitiativePortfolioRepository.listInitiatives(tenantId);
  const businessObjectives = economicOutcomeAttributionService.listBusinessObjectives(tenantId);

  if (initiatives.length === 0) {
    return { completenessScore: 0, readiness: 'NOT_READY', gaps };
  }

  const ownedCount = initiatives.filter((i) => i.ownerPrincipalId || i.ownerName).length;
  const ownershipRatio = ownedCount / initiatives.length;

  const assetLinks = await aiInitiativePortfolioRepository.listAssetLinks(tenantId);
  const initiativesWithAssets = new Set(assetLinks.map((l) => l.initiativeId)).size;
  const assetLinkageRatio = initiativesWithAssets / initiatives.length;

  const outcomeLinks = await aiInitiativePortfolioRepository.listOutcomeLinks(tenantId);
  const initiativesWithOutcomes = new Set(outcomeLinks.map((l) => l.initiativeId)).size;
  const outcomeLinkageRatio = initiativesWithOutcomes / initiatives.length;

  const attributionLinks = await aiInitiativePortfolioRepository.listAttributionLinks(tenantId);
  const attributionIds = [...new Set(attributionLinks.map((l) => l.attributionId))];
  const attributions = (await Promise.all(attributionIds.map((id) => aiValueAttributionRepository.getAttribution(tenantId, id)))).filter((a): a is NonNullable<typeof a> => a != null);
  const evidenceCounts = await Promise.all(attributions.map((a) => aiValueAttributionRepository.listEvidence(tenantId, { attributionId: a.id })));
  const attributionsWithEvidence = evidenceCounts.filter((e) => e.length > 0).length;
  const evidenceLinkageRatio = attributions.length > 0 ? attributionsWithEvidence / attributions.length : 0;

  const objectivesWithSupportingInitiatives = businessObjectives.filter((o) => initiatives.some((i) => (i.objectiveIds ?? []).includes(o.id))).length;
  const objectiveLinkageRatio = businessObjectives.length > 0 ? objectivesWithSupportingInitiatives / businessObjectives.length : 1;

  const confidenceScores = attributions.map((a) => a.confidenceScore).filter((c): c is number => typeof c === 'number');
  const confidenceCoverage = confidenceScores.length > 0 ? Math.min(1, (confidenceScores.reduce((s, c) => s + c, 0) / confidenceScores.length) / 100) : 0;

  const score = Math.round(
    (ownershipRatio * 20) + (assetLinkageRatio * 20) + (outcomeLinkageRatio * 20)
    + (evidenceLinkageRatio * 20) + (objectiveLinkageRatio * 10) + (confidenceCoverage * 10),
  );

  return { completenessScore: score, readiness: readinessFromScore(score), gaps };
}

function reachableSubgraph(allNodes: AIValueGraphNode[], allEdges: AIValueGraphEdge[], gaps: AIValueGraphGap[], rootId: string) {
  const nodeById = new Map(allNodes.map((n) => [n.id, n]));
  if (!nodeById.has(rootId)) return { nodes: [] as AIValueGraphNode[], edges: [] as AIValueGraphEdge[], gaps: [] as AIValueGraphGap[] };

  const visited = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of allEdges) {
      if (edge.from === current && !visited.has(edge.to)) { visited.add(edge.to); queue.push(edge.to); }
      if (edge.to === current && !visited.has(edge.from)) { visited.add(edge.from); queue.push(edge.from); }
    }
  }

  const nodes = allNodes.filter((n) => visited.has(n.id));
  const edges = allEdges.filter((e) => visited.has(e.from) && visited.has(e.to));
  const relevantGaps = gaps.filter((g) => g.affectedNodeIds.some((id) => visited.has(id)));
  return { nodes, edges, gaps: relevantGaps };
}

export class AIValueGraphService {
  async getGraph(tenantId: string): Promise<AIValueGraph> {
    const acc = await buildAIValueGraph(tenantId);
    const nodes = [...acc.nodes.values()];
    const edges = [...acc.edges.values()];
    const completeness = await computeCompleteness(tenantId, acc.gaps);
    return { tenantId, nodes, edges, gaps: acc.gaps, completenessScore: completeness.completenessScore, readiness: completeness.readiness };
  }

  /** Capability 3: initiative-centric graph. */
  async getInitiativeGraph(tenantId: string, initiativeId: string): Promise<AIValueGraph> {
    const graph = await this.getGraph(tenantId);
    const sub = reachableSubgraph(graph.nodes, graph.edges, graph.gaps, `initiative:${initiativeId}`);
    return { tenantId, ...sub, completenessScore: graph.completenessScore, readiness: graph.readiness };
  }

  /** Capability 4: asset-centric graph — answers "why do we own this asset?" */
  async getAssetGraph(tenantId: string, assetId: string): Promise<AIValueGraph> {
    const graph = await this.getGraph(tenantId);
    const sub = reachableSubgraph(graph.nodes, graph.edges, graph.gaps, `asset:${assetId}`);
    return { tenantId, ...sub, completenessScore: graph.completenessScore, readiness: graph.readiness };
  }

  /** Capability 5: objective-centric graph. */
  async getObjectiveGraph(tenantId: string, objectiveId: string): Promise<AIValueGraph> {
    const graph = await this.getGraph(tenantId);
    const sub = reachableSubgraph(graph.nodes, graph.edges, graph.gaps, `objective:${objectiveId}`);
    return { tenantId, ...sub, completenessScore: graph.completenessScore, readiness: graph.readiness };
  }

  /** Capability 8: human-readable "why do we own this asset?" answer. */
  async getWhyAssetExists(tenantId: string, assetId: string): Promise<{ assetId: string; found: boolean; nodes: AIValueGraphNode[]; edges: AIValueGraphEdge[]; gaps: AIValueGraphGap[]; explanation: string }> {
    const sub = await this.getAssetGraph(tenantId, assetId);
    if (sub.nodes.length === 0) {
      return { assetId, found: false, nodes: [], edges: [], gaps: [], explanation: `No graph relationships are recorded for AI asset ${assetId}; existence cannot be justified from current data.` };
    }
    const initiatives = sub.nodes.filter((n) => n.type === 'INITIATIVE').map((n) => n.label);
    const outcomes = sub.nodes.filter((n) => n.type === 'OUTCOME').map((n) => n.label);
    const objectives = sub.nodes.filter((n) => n.type === 'OBJECTIVE').map((n) => n.label);
    const evidenceCount = sub.nodes.filter((n) => n.type === 'EVIDENCE').length;
    const explanation = `AI asset ${assetId} is connected to ${initiatives.length} initiative(s) [${initiatives.join(', ') || 'none'}], `
      + `${outcomes.length} outcome(s), ${objectives.length} objective(s), and ${evidenceCount} piece(s) of evidence. `
      + (sub.gaps.length > 0 ? `${sub.gaps.length} graph gap(s) affect this asset's value chain.` : 'No graph gaps affect this asset.');
    return { assetId, found: true, nodes: sub.nodes, edges: sub.edges, gaps: sub.gaps, explanation };
  }

  /** Capability 8: human-readable initiative value path. */
  async getInitiativeValuePath(tenantId: string, initiativeId: string): Promise<{ initiativeId: string; found: boolean; nodes: AIValueGraphNode[]; edges: AIValueGraphEdge[]; gaps: AIValueGraphGap[]; explanation: string }> {
    const sub = await this.getInitiativeGraph(tenantId, initiativeId);
    if (sub.nodes.length === 0) {
      return { initiativeId, found: false, nodes: [], edges: [], gaps: [], explanation: `Initiative ${initiativeId} was not found in the value graph.` };
    }
    const assets = sub.nodes.filter((n) => n.type === 'AI_ASSET').length;
    const outcomes = sub.nodes.filter((n) => n.type === 'OUTCOME').length;
    const objectives = sub.nodes.filter((n) => n.type === 'OBJECTIVE').map((n) => n.label);
    const owner = sub.nodes.find((n) => n.type === 'OWNER')?.label;
    const explanation = `Initiative ${initiativeId} is owned by ${owner ?? 'no recorded owner'}, links to ${assets} AI asset(s), `
      + `has produced ${outcomes} outcome(s), and supports objective(s) [${objectives.join(', ') || 'none'}]. `
      + (sub.gaps.length > 0 ? `${sub.gaps.length} graph gap(s) remain on this initiative's value chain.` : 'No graph gaps on this initiative.');
    return { initiativeId, found: true, nodes: sub.nodes, edges: sub.edges, gaps: sub.gaps, explanation };
  }

  /** Capability 8: human-readable objective support path. */
  async getObjectiveSupportPath(tenantId: string, objectiveId: string): Promise<{ objectiveId: string; found: boolean; nodes: AIValueGraphNode[]; edges: AIValueGraphEdge[]; gaps: AIValueGraphGap[]; explanation: string }> {
    const sub = await this.getObjectiveGraph(tenantId, objectiveId);
    if (sub.nodes.length === 0) {
      return { objectiveId, found: false, nodes: [], edges: [], gaps: [], explanation: `Objective ${objectiveId} was not found in the value graph.` };
    }
    const initiatives = sub.nodes.filter((n) => n.type === 'INITIATIVE').map((n) => n.label);
    const explanation = `Objective ${objectiveId} is supported by ${initiatives.length} initiative(s) [${initiatives.join(', ') || 'none'}]. `
      + (sub.gaps.length > 0 ? `${sub.gaps.length} graph gap(s) affect this objective's support chain.` : 'No graph gaps affect this objective.');
    return { objectiveId, found: true, nodes: sub.nodes, edges: sub.edges, gaps: sub.gaps, explanation };
  }

  /** Capability 8: all current graph gaps for the tenant. */
  async getGraphGaps(tenantId: string): Promise<AIValueGraphGap[]> {
    const graph = await this.getGraph(tenantId);
    return graph.gaps;
  }

  /** Capability 8: executive-readable summary of graph health. */
  async getExecutiveGraphSummary(tenantId: string): Promise<{ tenantId: string; completenessScore: number; readiness: AIValueGraphReadiness; nodeCount: number; edgeCount: number; gapCount: number; highSeverityGaps: number; summary: string }> {
    const graph = await this.getGraph(tenantId);
    const highSeverityGaps = graph.gaps.filter((g) => g.severity === 'HIGH').length;
    const summary = `AI value graph is ${graph.readiness} (${graph.completenessScore}/100) with ${graph.nodes.length} node(s), `
      + `${graph.edges.length} edge(s), and ${graph.gaps.length} gap(s) (${highSeverityGaps} high severity).`;
    return {
      tenantId, completenessScore: graph.completenessScore, readiness: graph.readiness,
      nodeCount: graph.nodes.length, edgeCount: graph.edges.length, gapCount: graph.gaps.length, highSeverityGaps, summary,
    };
  }
}

export const aiValueGraphService = new AIValueGraphService();
