// Program AI3 — AI Value Graph Completion.
//
// Connects the chain Initiative -> Assets -> Contributors -> Usage -> Evidence
// -> Outcomes -> Value Signals -> Objectives -> Owners -> Executives.
// Builds the graph AI Economics will consume; does not calculate economics.
// Every node/edge here is derived from an existing, persisted relationship in
// AI1 (ai-value-attribution) or AI2 (ai-initiative-portfolio) or
// economic-outcomes — nothing is fabricated. Where a relationship cannot be
// proven, a graph gap is recorded instead of an edge.

export type AIValueGraphNodeType =
  | 'EXECUTIVE' | 'OWNER' | 'COST_CENTRE' | 'DEPARTMENT' | 'OBJECTIVE' | 'INITIATIVE'
  | 'AI_ASSET' | 'AI_AGENT' | 'AI_MODEL' | 'AI_TOOL' | 'WORKFLOW' | 'MCP_SERVER'
  | 'USAGE_EVENT' | 'ATTRIBUTION' | 'EVIDENCE' | 'OUTCOME' | 'VALUE_SIGNAL'
  | 'RECOMMENDATION' | 'VENDOR';

export type AIValueGraphEdgeType =
  | 'OWNS' | 'SPONSORS' | 'FUNDS' | 'BELONGS_TO' | 'SUPPORTS' | 'USES' | 'CONTRIBUTES_TO'
  | 'ATTRIBUTED_TO' | 'EVIDENCED_BY' | 'PRODUCES' | 'DELIVERS' | 'MEASURES' | 'LINKED_TO'
  | 'RECOMMENDS' | 'DEPENDS_ON';

export interface AIValueGraphNode {
  id: string;
  tenantId: string;
  type: AIValueGraphNodeType;
  label: string;
  source: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface AIValueGraphEdge {
  id: string;
  tenantId: string;
  from: string;
  to: string;
  type: AIValueGraphEdgeType;
  source: string;
  evidenceIds?: string[];
  confidence?: number;
}

export type AIValueGraphGapSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type AIValueGraphGapArea =
  | 'OWNERSHIP' | 'OBJECTIVE_LINKAGE' | 'ASSET_LINKAGE' | 'OUTCOME_LINKAGE'
  | 'EVIDENCE_LINKAGE' | 'VALUE_SIGNAL_LINKAGE';

export interface AIValueGraphGap {
  id: string;
  severity: AIValueGraphGapSeverity;
  area: AIValueGraphGapArea;
  description: string;
  affectedNodeIds: string[];
  remediation: string;
}

export type AIValueGraphReadiness = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface AIValueGraphCompleteness {
  completenessScore: number;
  readiness: AIValueGraphReadiness;
  gaps: AIValueGraphGap[];
}

export interface AIValueGraph {
  tenantId: string;
  nodes: AIValueGraphNode[];
  edges: AIValueGraphEdge[];
  gaps: AIValueGraphGap[];
  completenessScore: number;
  readiness: AIValueGraphReadiness;
}

export interface AIValueGraphAuthorityResult {
  authority: 'AI_VALUE_GRAPH_AUTHORITY';
  tenantId: string;
  verdict: AIValueGraphReadiness;
  score: number;
  initiatives: { total: number; withOwners: number; withObjectives: number; withAssets: number; withOutcomes: number };
  attributions: { total: number; withEvidence: number };
  objectives: { total: number; withSupportingInitiatives: number };
  gapCount: number;
  reasoning: string;
}
