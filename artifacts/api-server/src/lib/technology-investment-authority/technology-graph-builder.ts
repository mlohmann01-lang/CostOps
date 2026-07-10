// Program X1+X2 — Capability 2: Technology Graph Builder.
//
// Builds entirely from existing, already-persisted authorities — the
// Technology Portfolio Authority and Outcome Attribution — reusing the same
// node/edge/gap accumulator shape pioneered by AI3's AI Value Graph builder.
// Rule: only create a graph relationship when evidence already exists; if a
// relationship cannot be proven from real data, record a graph gap instead
// of fabricating an edge.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import type { TechnologyPortfolioAsset } from '../technology-portfolio-authority/technology-portfolio-types';
import { economicOutcomeAttributionService } from '../economic-outcomes/economic-outcome-attribution';
import type {
  TechnologyGraphEdge, TechnologyGraphEdgeType, TechnologyGraphGap, TechnologyGraphGapArea,
  TechnologyGraphNode, TechnologyGraphNodeType,
} from './technology-investment-types';
import { CAPABILITY_UNKNOWN } from './technology-investment-types';

export interface TechnologyGraphAccumulator {
  nodes: Map<string, TechnologyGraphNode>;
  edges: Map<string, TechnologyGraphEdge>;
  gaps: TechnologyGraphGap[];
}

const assetNodeId = (id: string) => `asset:${id}`;
const ownerNodeId = (id: string) => `owner:${id}`;
const execNodeId = (id: string) => `exec:${id}`;
const deptNodeId = (id: string) => `dept:${id}`;
const ccNodeId = (id: string) => `cc:${id}`;
const vendorNodeId = (id: string) => `vendor:${id}`;
const contractNodeId = (id: string) => `contract:${id}`;
const renewalNodeId = (id: string) => `renewal:${id}`;
const outcomeNodeId = (id: string) => `outcome:${id}`;
const evidenceNodeId = (id: string) => `evidence:${id}`;
const capabilityNodeId = (name: string) => `capability:${name.toLowerCase().replace(/\s+/g, '-')}`;
const objectiveNodeId = (id: string) => `objective:${id}`;
const valueSignalNodeId = (id: string) => `signal:${id}`;

function assetNodeType(asset: TechnologyPortfolioAsset): TechnologyGraphNodeType {
  switch (asset.assetType) {
    case 'SAAS': return 'SAAS_APPLICATION';
    case 'CLOUD_SERVICE': return 'CLOUD_SERVICE';
    case 'DATA_PLATFORM': return 'DATA_PLATFORM';
    case 'AI_MODEL': case 'AI_AGENT': case 'AI_WORKFLOW': return 'AI_SYSTEM';
    case 'SECURITY_TOOL': return 'SECURITY_PLATFORM';
    default: return 'TECHNOLOGY_ASSET';
  }
}

function addNode(acc: TechnologyGraphAccumulator, tenantId: string, type: TechnologyGraphNodeType, id: string, label: string, source: string, metadata?: Record<string, unknown>) {
  if (!acc.nodes.has(id)) acc.nodes.set(id, { id, tenantId, type, label, source, metadata });
}

function addEdge(acc: TechnologyGraphAccumulator, tenantId: string, from: string, to: string, type: TechnologyGraphEdgeType, source: string, evidenceIds?: string[]) {
  const id = `edge:${type}:${from}:${to}`;
  if (!acc.edges.has(id)) acc.edges.set(id, { id, tenantId, from, to, type, source, evidenceIds });
}

function addGap(acc: TechnologyGraphAccumulator, severity: TechnologyGraphGap['severity'], area: TechnologyGraphGapArea, affectedNodeIds: string[], description: string, remediation: string) {
  acc.gaps.push({ id: `gap:${area}:${affectedNodeIds.join(',')}`, severity, area, description, affectedNodeIds, remediation });
}

export async function buildTechnologyGraph(tenantId: string): Promise<TechnologyGraphAccumulator> {
  const acc: TechnologyGraphAccumulator = { nodes: new Map(), edges: new Map(), gaps: [] };

  const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
  const assets = portfolio.assets;
  const objectives = economicOutcomeAttributionService.listBusinessObjectives(tenantId);

  const capabilitySupportingAssetIds = new Map<string, Set<string>>();

  for (const asset of assets) {
    const aId = assetNodeId(asset.id);
    addNode(acc, tenantId, assetNodeType(asset), aId, asset.name, 'technology-portfolio-authority', { lifecycleStatus: asset.lifecycleStatus, criticality: asset.criticality });

    if (asset.ownerUserId) {
      const oId = ownerNodeId(asset.ownerUserId);
      addNode(acc, tenantId, 'OWNER', oId, asset.ownerUserId, 'technology-portfolio-authority');
      addEdge(acc, tenantId, oId, aId, 'OWNS', 'technology-portfolio-authority');
    } else {
      addGap(acc, 'HIGH', 'OWNERSHIP', [aId], `Technology asset "${asset.name}" has no recorded owner.`, 'Assign an owner in the Technology Portfolio Authority.');
    }

    if (asset.executiveOwnerId) {
      const eId = execNodeId(asset.executiveOwnerId);
      addNode(acc, tenantId, 'EXECUTIVE', eId, asset.executiveOwnerId, 'technology-portfolio-authority');
      addEdge(acc, tenantId, eId, aId, 'SPONSORS', 'technology-portfolio-authority');
    }

    if (asset.departmentId) {
      const dId = deptNodeId(asset.departmentId);
      addNode(acc, tenantId, 'DEPARTMENT', dId, asset.departmentId, 'technology-portfolio-authority');
      addEdge(acc, tenantId, dId, aId, 'USES', 'technology-portfolio-authority');
    }

    if (asset.costCentreId) {
      const cId = ccNodeId(asset.costCentreId);
      addNode(acc, tenantId, 'COST_CENTRE', cId, asset.costCentreId, 'technology-portfolio-authority');
      addEdge(acc, tenantId, cId, aId, 'FUNDS', 'technology-portfolio-authority');
    }

    if (asset.vendorId) {
      const vId = vendorNodeId(asset.vendorId);
      const vendor = portfolio.vendors.find((v) => v.id === asset.vendorId);
      addNode(acc, tenantId, 'VENDOR', vId, vendor?.name ?? asset.vendorId, 'technology-portfolio-authority');
      addEdge(acc, tenantId, aId, vId, 'DEPENDS_ON', 'technology-portfolio-authority');
    }

    for (const contractId of asset.contractIds) {
      const cId = contractNodeId(contractId);
      addNode(acc, tenantId, 'CONTRACT', cId, contractId, 'technology-portfolio-authority');
      addEdge(acc, tenantId, aId, cId, 'CONTRACTED_TO', 'technology-portfolio-authority');
    }

    if (asset.contractIds.length > 0 && asset.renewalIds.length === 0) {
      addGap(acc, 'MEDIUM', 'RENEWAL_VISIBILITY', [aId], `Technology asset "${asset.name}" has a contract but no tracked renewal.`, 'Link a renewal record to this asset.');
    }
    for (const renewalId of asset.renewalIds) {
      const rId = renewalNodeId(renewalId);
      addNode(acc, tenantId, 'RENEWAL', rId, renewalId, 'technology-portfolio-authority');
      addEdge(acc, tenantId, rId, aId, 'RENEWS', 'technology-portfolio-authority');
    }

    const capabilityName = asset.businessCapability && asset.businessCapability.trim().length > 0 ? asset.businessCapability : CAPABILITY_UNKNOWN;
    const capId = capabilityNodeId(capabilityName);
    addNode(acc, tenantId, 'BUSINESS_CAPABILITY', capId, capabilityName, 'technology-portfolio-authority');
    addEdge(acc, tenantId, aId, capId, 'SUPPORTS', 'technology-portfolio-authority');
    if (!capabilitySupportingAssetIds.has(capabilityName)) capabilitySupportingAssetIds.set(capabilityName, new Set());
    capabilitySupportingAssetIds.get(capabilityName)!.add(asset.id);
    if (capabilityName === CAPABILITY_UNKNOWN) {
      addGap(acc, 'MEDIUM', 'CAPABILITY_MAPPING', [aId], `Technology asset "${asset.name}" has no business capability mapping.`, 'Record a businessCapability for this asset in the Technology Portfolio Authority.');
    }

    if (asset.outcomeIds.length === 0) {
      addGap(acc, 'HIGH', 'OUTCOME_LINKAGE', [aId], `Technology asset "${asset.name}" has no linked outcome.`, 'Attribute an economic outcome to this asset.');
    }
    for (const outcomeId of asset.outcomeIds) {
      const oId = outcomeNodeId(outcomeId);
      addNode(acc, tenantId, 'OUTCOME', oId, outcomeId, 'economic-outcomes');
      addEdge(acc, tenantId, aId, oId, 'PRODUCES', 'economic-outcomes');
    }

    if (asset.evidenceRefs.length === 0) {
      addGap(acc, 'MEDIUM', 'EVIDENCE_LINKAGE', [aId], `Technology asset "${asset.name}" has no linked evidence.`, 'Attach evidence records to this asset.');
    }
    for (const evidenceRef of asset.evidenceRefs) {
      const evId = evidenceNodeId(evidenceRef);
      addNode(acc, tenantId, 'EVIDENCE', evId, evidenceRef, 'technology-portfolio-authority');
      addEdge(acc, tenantId, aId, evId, 'EVIDENCED_BY', 'technology-portfolio-authority');
    }

    const valueSignals = economicOutcomeAttributionService.listValueSignals(tenantId, asset.id);
    for (const signal of valueSignals) {
      const sId = valueSignalNodeId(signal.id);
      addNode(acc, tenantId, 'VALUE_SIGNAL', sId, signal.signalType, 'economic-outcomes');
      addEdge(acc, tenantId, aId, sId, 'PRODUCES', 'economic-outcomes');
      if (signal.outcomeId) addEdge(acc, tenantId, sId, outcomeNodeId(signal.outcomeId), 'MEASURES', 'economic-outcomes');
    }
  }

  for (const objective of objectives) {
    const objId = objectiveNodeId(objective.id);
    addNode(acc, tenantId, 'BUSINESS_OBJECTIVE', objId, objective.name, 'economic-outcomes');

    let hasSupportingTechnology = false;
    for (const [capabilityName, assetIds] of capabilitySupportingAssetIds) {
      const capId = capabilityNodeId(capabilityName);
      const supportsThisObjective = (objective.linkedAssetIds ?? []).some((assetId) => assetIds.has(assetId));
      if (supportsThisObjective) {
        addEdge(acc, tenantId, capId, objId, 'CONTRIBUTES_TO', 'economic-outcomes');
        hasSupportingTechnology = true;
      }
    }
    if (!hasSupportingTechnology) {
      addGap(acc, 'MEDIUM', 'OBJECTIVE_LINKAGE', [objId], `Business objective "${objective.name}" has no supporting technology capability.`, 'Link a technology asset or capability to this objective.');
    }
  }

  return acc;
}
