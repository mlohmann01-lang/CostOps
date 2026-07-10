// Program X1+X2 — Technology Investment Authority & Technology Value Graph.
// Extends the AI Decision System into an enterprise-wide Technology Decision
// System by reusing the Technology Portfolio Authority, AI Value Graph
// patterns, and Outcome Attribution — never duplicating them.

export type TechnologyGraphNodeType =
  | 'EXECUTIVE' | 'OWNER' | 'DEPARTMENT' | 'COST_CENTRE'
  | 'BUSINESS_CAPABILITY' | 'BUSINESS_PROCESS' | 'BUSINESS_OBJECTIVE'
  | 'TECHNOLOGY_ASSET' | 'SAAS_APPLICATION' | 'CLOUD_SERVICE' | 'DATA_PLATFORM'
  | 'AI_SYSTEM' | 'SECURITY_PLATFORM' | 'VENDOR' | 'CONTRACT' | 'RENEWAL'
  | 'OUTCOME' | 'VALUE_SIGNAL' | 'RECOMMENDATION' | 'EVIDENCE';

export type TechnologyGraphEdgeType =
  | 'OWNS' | 'SPONSORS' | 'FUNDS' | 'SUPPORTS' | 'ENABLES' | 'USES'
  | 'DEPENDS_ON' | 'CONTRACTED_TO' | 'RENEWS' | 'PRODUCES' | 'CONTRIBUTES_TO'
  | 'MEASURES' | 'RECOMMENDS' | 'EVIDENCED_BY';

export interface TechnologyGraphNode {
  id: string;
  tenantId: string;
  type: TechnologyGraphNodeType;
  label: string;
  source: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface TechnologyGraphEdge {
  id: string;
  tenantId: string;
  from: string;
  to: string;
  type: TechnologyGraphEdgeType;
  source: string;
  evidenceIds?: string[];
  confidence?: number;
}

export type TechnologyGraphGapArea =
  | 'OWNERSHIP' | 'CAPABILITY_MAPPING' | 'OBJECTIVE_LINKAGE' | 'OUTCOME_LINKAGE'
  | 'EVIDENCE_LINKAGE' | 'RENEWAL_VISIBILITY';

export interface TechnologyGraphGap {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  area: TechnologyGraphGapArea;
  description: string;
  affectedNodeIds: string[];
  remediation: string;
}

export type TechnologyGraphReadiness = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface TechnologyGraph {
  tenantId: string;
  nodes: TechnologyGraphNode[];
  edges: TechnologyGraphEdge[];
  gaps: TechnologyGraphGap[];
  completenessScore: number;
  readiness: TechnologyGraphReadiness;
}

/**
 * Capability 3: business capability mapping. Only ever built from discovered
 * metadata (TechnologyPortfolioAsset.businessCapability), existing ownership
 * mappings and existing business objectives. Never invented.
 */
export interface BusinessCapability {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  ownerId?: string;
  supportingTechnologyIds: string[];
  outcomeIds: string[];
  objectiveIds: string[];
}

export const CAPABILITY_UNKNOWN = 'CAPABILITY_UNKNOWN';

export type TechnologyInvestmentDecision = 'KEEP' | 'OPTIMISE' | 'CONSOLIDATE' | 'RENEW' | 'RETIRE' | 'REVIEW';

export interface TechnologyInvestmentRecommendation {
  id: string;
  tenantId: string;
  assetId: string;
  decision: TechnologyInvestmentDecision;
  rationale: string[];
  confidenceScore: number;
  generatedAt: string;
}

export interface TechnologyInvestmentSummary {
  tenantId: string;
  totalTechnologies: number;
  mappedCapabilities: number;
  mappedObjectives: number;
  mappedOutcomes: number;
  renewalsUpcoming: number;
  ownershipCoverage: number;
  graphCompleteness: number;
  recommendationDistribution: Record<TechnologyInvestmentDecision, number>;
  generatedAt: string;
}

export interface TechnologyInvestmentAuthorityResult {
  authority: 'TECHNOLOGY_INVESTMENT_AUTHORITY';
  tenantId: string;
  verdict: TechnologyGraphReadiness;
  score: number;
  portfolioCoverage: { total: number; inGraph: number };
  ownership: { total: number; withOwner: number };
  capability: { total: number; mapped: number };
  outcome: { total: number; withOutcome: number };
  objective: { total: number; withSupportingTechnology: number };
  renewal: { total: number; visible: number };
  evidence: { total: number; withEvidence: number };
  gapCount: number;
  reasoning: string;
}
