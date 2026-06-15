import { PersistenceStore, getPersistenceProvider } from "../persistence/persistence-provider";
import { PersistenceCollections } from "../persistence/persistence-collections";
import type { EconomicGraphNode, EconomicGraphEdge, GraphNodeFilters, GraphEdgeFilters, NeighborDirection } from "./economic-knowledge-graph-types";

export class EconomicGraphRepository {
  private readonly nodes: PersistenceStore<EconomicGraphNode>;
  private readonly edges: PersistenceStore<EconomicGraphEdge>;

  constructor() {
    const provider = getPersistenceProvider();
    this.nodes = new PersistenceStore<EconomicGraphNode>(provider, PersistenceCollections.ECONOMIC_GRAPH_NODES);
    this.edges = new PersistenceStore<EconomicGraphEdge>(provider, PersistenceCollections.ECONOMIC_GRAPH_EDGES);
  }

  async upsertNode(node: EconomicGraphNode): Promise<EconomicGraphNode> {
    if (!node.tenantId) throw new Error("GRAPH_NODE_TENANT_REQUIRED");
    if (node.confidence < 0 || node.confidence > 1) throw new Error("GRAPH_NODE_CONFIDENCE_INVALID");
    const existing = await this.nodes.get(node.tenantId, node.id);
    const merged: EconomicGraphNode = existing
      ? { ...existing, ...node, createdAt: existing.createdAt, evidenceRefs: Array.from(new Set([...existing.evidenceRefs, ...node.evidenceRefs])) }
      : node;
    return this.nodes.upsert(merged);
  }

  async getNode(tenantId: string, nodeId: string): Promise<EconomicGraphNode | null> {
    return this.nodes.get(tenantId, nodeId);
  }

  async listNodes(tenantId: string, filters?: GraphNodeFilters): Promise<EconomicGraphNode[]> {
    const all = await this.nodes.list(tenantId);
    if (!filters) return all;
    return all.filter((n) =>
      (!filters.type || n.type === filters.type) &&
      (!filters.source || n.source === filters.source) &&
      (!filters.sourceEntityId || n.sourceEntityId === filters.sourceEntityId)
    );
  }

  async upsertEdge(edge: EconomicGraphEdge): Promise<{ edge: EconomicGraphEdge; created: boolean }> {
    if (!edge.tenantId) throw new Error("GRAPH_EDGE_TENANT_REQUIRED");
    if (edge.confidence < 0 || edge.confidence > 1) throw new Error("GRAPH_EDGE_CONFIDENCE_INVALID");
    const duplicate = await this.findEdgeByRelationship(edge.tenantId, edge.fromNodeId, edge.toNodeId, edge.type);
    if (duplicate) {
      const merged: EconomicGraphEdge = {
        ...duplicate,
        ...edge,
        id: duplicate.id,
        createdAt: duplicate.createdAt,
        evidenceRefs: Array.from(new Set([...duplicate.evidenceRefs, ...edge.evidenceRefs])),
        updatedAt: new Date().toISOString(),
      };
      return { edge: await this.edges.upsert(merged), created: false };
    }
    return { edge: await this.edges.upsert(edge), created: true };
  }

  async getEdge(tenantId: string, edgeId: string): Promise<EconomicGraphEdge | null> {
    return this.edges.get(tenantId, edgeId);
  }

  async listEdges(tenantId: string, filters?: GraphEdgeFilters): Promise<EconomicGraphEdge[]> {
    const all = await this.edges.list(tenantId);
    if (!filters) return all;
    return all.filter((e) =>
      (!filters.type || e.type === filters.type) &&
      (!filters.fromNodeId || e.fromNodeId === filters.fromNodeId) &&
      (!filters.toNodeId || e.toNodeId === filters.toNodeId) &&
      (!filters.source || e.source === filters.source)
    );
  }

  async findNeighbors(tenantId: string, nodeId: string, direction: NeighborDirection = "BOTH"): Promise<{ nodes: EconomicGraphNode[]; edges: EconomicGraphEdge[] }> {
    const allEdges = await this.edges.list(tenantId);
    let matchedEdges: EconomicGraphEdge[];
    if (direction === "OUTBOUND") matchedEdges = allEdges.filter((e) => e.fromNodeId === nodeId);
    else if (direction === "INBOUND") matchedEdges = allEdges.filter((e) => e.toNodeId === nodeId);
    else matchedEdges = allEdges.filter((e) => e.fromNodeId === nodeId || e.toNodeId === nodeId);
    const neighborIds = new Set(matchedEdges.flatMap((e) => [e.fromNodeId, e.toNodeId]).filter((id) => id !== nodeId));
    const nodes = (await Promise.all(Array.from(neighborIds).map((id) => this.nodes.get(tenantId, id)))).filter((n): n is EconomicGraphNode => n !== null);
    return { nodes, edges: matchedEdges };
  }

  async findPath(tenantId: string, fromNodeId: string, toNodeId: string, maxDepth = 5): Promise<EconomicGraphNode[]> {
    if (fromNodeId === toNodeId) {
      const node = await this.nodes.get(tenantId, fromNodeId);
      return node ? [node] : [];
    }
    const allEdges = await this.edges.list(tenantId);
    const adjacency = new Map<string, string[]>();
    for (const e of allEdges) {
      if (!adjacency.has(e.fromNodeId)) adjacency.set(e.fromNodeId, []);
      adjacency.get(e.fromNodeId)!.push(e.toNodeId);
    }
    const visited = new Set<string>([fromNodeId]);
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: fromNodeId, path: [fromNodeId] }];
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      if (path.length >= maxDepth) continue;
      for (const next of adjacency.get(nodeId) ?? []) {
        if (next === toNodeId) {
          const fullPath = [...path, toNodeId];
          return (await Promise.all(fullPath.map((id) => this.nodes.get(tenantId, id)))).filter((n): n is EconomicGraphNode => n !== null);
        }
        if (!visited.has(next)) {
          visited.add(next);
          queue.push({ nodeId: next, path: [...path, next] });
        }
      }
    }
    return [];
  }

  async deleteTenantGraph(tenantId: string): Promise<void> {
    await this.nodes.clearTenant(tenantId);
    await this.edges.clearTenant(tenantId);
  }

  clearAll(): void {
    this.nodes.clearAll();
    this.edges.clearAll();
  }

  private async findEdgeByRelationship(tenantId: string, fromNodeId: string, toNodeId: string, type: string): Promise<EconomicGraphEdge | null> {
    const all = await this.edges.list(tenantId);
    return all.find((e) => e.fromNodeId === fromNodeId && e.toNodeId === toNodeId && e.type === type) ?? null;
  }
}

export const economicGraphRepository = new EconomicGraphRepository();
