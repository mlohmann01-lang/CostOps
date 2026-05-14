export type GraphNodeType = 'user' | 'application' | 'entitlement' | 'department' | 'governance_surface';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  confidence: number;
  updatedAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
  confidence: number;
}

export interface BlastRadiusResult {
  impactedUsers: string[];
  impactedApps: string[];
  impactedEntitlements: string[];
  impactedDepartments: string[];
  impactedGovernanceSurfaces: string[];
}

export function traverseGraph(startNodeId: string, edges: GraphEdge[]): string[] {
  return edges.filter((edge) => edge.from === startNodeId).map((edge) => edge.to);
}

export function analyzeBlastRadius(seedNodeIds: string[], nodes: GraphNode[], edges: GraphEdge[]): BlastRadiusResult {
  const impacted = new Set(seedNodeIds);
  for (const seed of seedNodeIds) {
    for (const nodeId of traverseGraph(seed, edges)) impacted.add(nodeId);
  }
  const byType = (type: GraphNodeType) => nodes.filter((node) => impacted.has(node.id) && node.type === type).map((node) => node.id);
  return {
    impactedUsers: byType('user'),
    impactedApps: byType('application'),
    impactedEntitlements: byType('entitlement'),
    impactedDepartments: byType('department'),
    impactedGovernanceSurfaces: byType('governance_surface')
  };
}

export function propagateConfidence(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const confidenceMap = new Map(nodes.map((n) => [n.id, n.confidence]));
  for (const edge of edges) {
    const source = confidenceMap.get(edge.from) ?? 0.5;
    const target = confidenceMap.get(edge.to) ?? 0.5;
    confidenceMap.set(edge.to, Math.max(target, source * edge.confidence));
  }
  return nodes.map((n) => ({ ...n, confidence: confidenceMap.get(n.id) ?? n.confidence }));
}

export function scoreGraphOperationalMaturity(nodes: GraphNode[], edges: GraphEdge[]): number {
  const nodeScore = nodes.reduce((sum, node) => sum + node.confidence, 0) / Math.max(nodes.length, 1);
  const edgeScore = edges.reduce((sum, edge) => sum + edge.confidence, 0) / Math.max(edges.length, 1);
  return Number((((nodeScore * 0.7) + (edgeScore * 0.3)) * 100).toFixed(2));
}
