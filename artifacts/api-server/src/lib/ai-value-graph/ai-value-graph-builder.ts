// Program AI3 — Capability 1 & 2: canonical graph model + graph builder.
//
// Reuses AI1 (ai-value-attribution) and AI2 (ai-initiative-portfolio) data and
// economic-outcomes business objectives/value signals. No new persistence —
// the graph is derived on read from already-persisted relationships.

import { aiInitiativePortfolioRepository } from '../ai-initiative-portfolio/ai-initiative-portfolio-repository';
import { aiInitiativePortfolioService } from '../ai-initiative-portfolio/ai-initiative-portfolio-service';
import type { AIInitiative } from '../ai-initiative-portfolio/ai-initiative-portfolio-types';
import { aiValueAttributionRepository } from '../ai-value-attribution/ai-value-attribution-repository';
import { aiValueAttributionService } from '../ai-value-attribution/ai-value-attribution-service';
import { economicOutcomeAttributionService } from '../economic-outcomes/economic-outcome-attribution';
import type { AIValueGraphEdge, AIValueGraphEdgeType, AIValueGraphGap, AIValueGraphNode, AIValueGraphNodeType } from './ai-value-graph-types';

const CONTRIBUTOR_NODE_TYPE: Record<string, AIValueGraphNodeType> = {
  ASSET: 'AI_ASSET', AGENT: 'AI_AGENT', WORKFLOW: 'WORKFLOW', HUMAN: 'OWNER', CONNECTOR: 'MCP_SERVER',
};

export class AIValueGraphAccumulator {
  readonly nodes = new Map<string, AIValueGraphNode>();
  readonly edges = new Map<string, AIValueGraphEdge>();
  readonly gaps: AIValueGraphGap[] = [];

  node(id: string, tenantId: string, type: AIValueGraphNodeType, label: string, source: string, confidence?: number, metadata?: Record<string, unknown>) {
    if (!this.nodes.has(id)) this.nodes.set(id, { id, tenantId, type, label, source, confidence, metadata });
    return id;
  }

  edge(tenantId: string, from: string, to: string, type: AIValueGraphEdgeType, source: string, evidenceIds?: string[], confidence?: number) {
    const id = `edge:${type}:${from}:${to}`;
    if (!this.edges.has(id)) this.edges.set(id, { id, tenantId, from, to, type, source, evidenceIds, confidence });
    return id;
  }

  gap(severity: AIValueGraphGap['severity'], area: AIValueGraphGap['area'], description: string, affectedNodeIds: string[], remediation: string) {
    this.gaps.push({ id: `gap:${area}:${affectedNodeIds.join(',')}`, severity, area, description, affectedNodeIds, remediation });
  }
}

/**
 * Builds the connected AI value graph for one tenant from real, persisted
 * relationships only. Where a relationship cannot be proven (e.g. a missing
 * owner, an attribution with no evidence), a gap is recorded instead of an
 * edge — see Non-Negotiable Rule 1/2.
 */
export async function buildAIValueGraph(tenantId: string): Promise<AIValueGraphAccumulator> {
  const acc = new AIValueGraphAccumulator();
  const initiatives = await aiInitiativePortfolioService.listInitiatives(tenantId);
  const businessObjectives = economicOutcomeAttributionService.listBusinessObjectives(tenantId);
  const knownAssetIds = new Set<string>();

  for (const initiative of initiatives) {
    await addInitiativeToGraph(acc, tenantId, initiative, knownAssetIds);
  }

  // Objective nodes + LINKED_TO edges to known AI assets only — never mixing
  // in non-AI technology-portfolio assets that happen to share an objective.
  for (const objective of businessObjectives) {
    acc.node(objKey(objective.id), tenantId, 'OBJECTIVE', objective.name, 'economic-outcomes', undefined, { objectiveId: objective.id });
    for (const assetId of objective.linkedAssetIds) {
      if (knownAssetIds.has(assetId)) {
        acc.edge(tenantId, assetKey(assetId), objKey(objective.id), 'LINKED_TO', 'economic-outcomes');
      }
    }
    if (!initiatives.some((i) => (i.objectiveIds ?? []).includes(objective.id))) {
      acc.gap('MEDIUM', 'OBJECTIVE_LINKAGE', `Objective "${objective.name}" has no supporting initiative.`, [objKey(objective.id)], 'Link an initiative to this objective via linkObjective().');
    }
  }

  // Value signals for known AI assets only.
  for (const assetId of knownAssetIds) {
    const signals = economicOutcomeAttributionService.listValueSignals(tenantId, assetId);
    if (signals.length === 0) {
      acc.gap('LOW', 'VALUE_SIGNAL_LINKAGE', `AI asset ${assetId} has no recorded value signal.`, [assetKey(assetId)], 'Capture a ValueSignal for this asset via economic-outcomes.');
      continue;
    }
    for (const signal of signals) {
      const signalId = acc.node(`signal:${signal.id}`, tenantId, 'VALUE_SIGNAL', `${signal.signalType} (${signal.value} ${signal.unit})`, 'economic-outcomes', undefined, { signalId: signal.id });
      acc.edge(tenantId, assetKey(assetId), signalId, 'MEASURES', 'economic-outcomes');
      if (signal.outcomeId && acc.nodes.has(outcomeKey(signal.outcomeId))) {
        acc.edge(tenantId, signalId, outcomeKey(signal.outcomeId), 'LINKED_TO', 'economic-outcomes');
      }
    }
  }

  return acc;
}

async function addInitiativeToGraph(acc: AIValueGraphAccumulator, tenantId: string, initiative: AIInitiative, knownAssetIds: Set<string>) {
  const initiativeId = acc.node(initKey(initiative.id), tenantId, 'INITIATIVE', initiative.name, 'ai-initiative-portfolio', undefined, { initiativeId: initiative.id });

  if (initiative.ownerPrincipalId || initiative.ownerName) {
    const ownerId = ownerKey(initiative.ownerPrincipalId ?? initiative.ownerName!);
    acc.node(ownerId, tenantId, 'OWNER', initiative.ownerName ?? initiative.ownerPrincipalId!, 'ai-initiative-portfolio');
    acc.edge(tenantId, ownerId, initiativeId, 'OWNS', 'ai-initiative-portfolio');
  } else {
    acc.gap('HIGH', 'OWNERSHIP', `Initiative "${initiative.name}" has no recorded owner.`, [initiativeId], 'Assign ownerName/ownerPrincipalId via updateInitiative().');
  }

  if (initiative.businessSponsorPrincipalId || initiative.executiveSponsor) {
    const execId = executiveKey(initiative.businessSponsorPrincipalId ?? initiative.executiveSponsor!);
    acc.node(execId, tenantId, 'EXECUTIVE', initiative.executiveSponsor ?? initiative.businessSponsorPrincipalId!, 'ai-initiative-portfolio');
    acc.edge(tenantId, execId, initiativeId, 'SPONSORS', 'ai-initiative-portfolio');
  }

  if (initiative.department) {
    const deptId = acc.node(deptKey(initiative.department), tenantId, 'DEPARTMENT', initiative.department, 'ai-initiative-portfolio');
    acc.edge(tenantId, initiativeId, deptId, 'BELONGS_TO', 'ai-initiative-portfolio');
  }

  if (initiative.costCentre) {
    const ccId = acc.node(ccKey(initiative.costCentre), tenantId, 'COST_CENTRE', initiative.costCentre, 'ai-initiative-portfolio');
    acc.edge(tenantId, ccId, initiativeId, 'FUNDS', 'ai-initiative-portfolio');
  }

  const assetLinks = await aiInitiativePortfolioRepository.listAssetLinks(tenantId, { initiativeId: initiative.id });
  if (assetLinks.length === 0) {
    acc.gap('MEDIUM', 'ASSET_LINKAGE', `Initiative "${initiative.name}" has no linked AI asset.`, [initiativeId], 'Link an AI asset via linkAsset().');
  }
  for (const link of assetLinks) {
    knownAssetIds.add(link.assetId);
    const assetId = acc.node(assetKey(link.assetId), tenantId, 'AI_ASSET', link.assetId, 'ai-initiative-portfolio');
    acc.edge(tenantId, assetId, initiativeId, 'SUPPORTS', 'ai-initiative-portfolio');
  }

  const objectiveLinks = await aiInitiativePortfolioRepository.listObjectiveLinks(tenantId, { initiativeId: initiative.id });
  for (const link of objectiveLinks) {
    const objectiveId = acc.node(objKey(link.objectiveId), tenantId, 'OBJECTIVE', link.objectiveId, 'ai-initiative-portfolio');
    acc.edge(tenantId, initiativeId, objectiveId, 'DELIVERS', 'ai-initiative-portfolio');
  }

  const outcomeLinks = await aiInitiativePortfolioRepository.listOutcomeLinks(tenantId, { initiativeId: initiative.id });
  if (outcomeLinks.length === 0) {
    acc.gap('HIGH', 'OUTCOME_LINKAGE', `Initiative "${initiative.name}" has produced no recorded outcome.`, [initiativeId], 'Link an outcome via linkOutcome() once a real outcome is observed.');
  }
  for (const link of outcomeLinks) {
    const outcomeId = acc.node(outcomeKey(link.outcomeId), tenantId, 'OUTCOME', link.outcomeId, 'ai-initiative-portfolio', link.confidence);
    acc.edge(tenantId, initiativeId, outcomeId, 'PRODUCES', 'ai-initiative-portfolio', undefined, link.confidence);
  }

  const attributionLinks = await aiInitiativePortfolioRepository.listAttributionLinks(tenantId, { initiativeId: initiative.id });
  for (const link of attributionLinks) {
    await addAttributionToGraph(acc, tenantId, initiativeId, link.attributionId, knownAssetIds);
  }

  const recommendation = await aiInitiativePortfolioService.recommendAction(tenantId, initiative.id);
  const recId = acc.node(`rec:${initiative.id}`, tenantId, 'RECOMMENDATION', recommendation.action, 'ai-initiative-portfolio', undefined, { reasoning: recommendation.reasoning });
  acc.edge(tenantId, recId, initiativeId, 'RECOMMENDS', 'ai-initiative-portfolio');
}

async function addAttributionToGraph(acc: AIValueGraphAccumulator, tenantId: string, initiativeId: string, attributionId: string, knownAssetIds: Set<string>) {
  const attribution = await aiValueAttributionRepository.getAttribution(tenantId, attributionId);
  if (!attribution) return;
  const attrId = acc.node(attrKey(attribution.id), tenantId, 'ATTRIBUTION', attribution.attributionType, 'ai-value-attribution', attribution.confidenceScore, { attributionId: attribution.id });
  acc.edge(tenantId, initiativeId, attrId, 'CONTRIBUTES_TO', 'ai-value-attribution');

  if (attribution.assetId) {
    knownAssetIds.add(attribution.assetId);
    const assetId = acc.node(assetKey(attribution.assetId), tenantId, 'AI_ASSET', attribution.assetId, 'ai-value-attribution');
    acc.edge(tenantId, assetId, attrId, 'ATTRIBUTED_TO', 'ai-value-attribution');
  }

  const lineage = await aiValueAttributionService.getAttributionLineage(tenantId, attribution.id);
  for (const contributor of lineage.contributors) {
    const contribType = CONTRIBUTOR_NODE_TYPE[contributor.contributorType] ?? 'AI_ASSET';
    if (contributor.contributorType === 'ASSET') knownAssetIds.add(contributor.contributorId);
    const contribId = acc.node(`contrib:${contributor.contributorType}:${contributor.contributorId}`, tenantId, contribType, contributor.label ?? contributor.contributorId, 'ai-value-attribution');
    acc.edge(tenantId, contribId, attrId, 'CONTRIBUTES_TO', 'ai-value-attribution', undefined, contributor.weight / 100);
  }

  if (lineage.evidence.length === 0) {
    acc.gap('HIGH', 'EVIDENCE_LINKAGE', `Attribution ${attribution.id} has no supporting evidence.`, [attrId], 'Attach evidence via aiValueAttributionService.addEvidence().');
  }
  for (const evidence of lineage.evidence) {
    const evidenceId = acc.node(`evidence:${evidence.id}`, tenantId, 'EVIDENCE', evidence.evidenceType, 'ai-value-attribution', undefined, { evidenceStrength: evidence.evidenceStrength, source: evidence.source });
    acc.edge(tenantId, attrId, evidenceId, 'EVIDENCED_BY', 'ai-value-attribution', [evidence.id]);
  }

  if (attribution.outcomeId) {
    const outcomeId = acc.node(outcomeKey(attribution.outcomeId), tenantId, 'OUTCOME', attribution.outcomeId, 'ai-value-attribution');
    acc.edge(tenantId, attrId, outcomeId, 'PRODUCES', 'ai-value-attribution', lineage.evidence.map((e) => e.id));
  }

  for (const objectiveId of lineage.objectiveIds) {
    const objId = acc.node(objKey(objectiveId), tenantId, 'OBJECTIVE', objectiveId, 'ai-value-attribution');
    acc.edge(tenantId, attrId, objId, 'DELIVERS', 'ai-value-attribution');
  }
}

const initKey = (id: string) => `initiative:${id}`;
const assetKey = (id: string) => `asset:${id}`;
const outcomeKey = (id: string) => `outcome:${id}`;
const objKey = (id: string) => `objective:${id}`;
const attrKey = (id: string) => `attribution:${id}`;
const ownerKey = (id: string) => `owner:${id}`;
const executiveKey = (id: string) => `executive:${id}`;
const deptKey = (id: string) => `dept:${id}`;
const ccKey = (id: string) => `cc:${id}`;
