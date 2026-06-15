import { EconomicGraphNodeType, EconomicGraphEdgeType } from "./economic-knowledge-graph-types";
import type { EconomicGraphNode, EconomicGraphEdge, GraphNodeFilters, GraphEdgeFilters, NeighborDirection } from "./economic-knowledge-graph-types";
import { economicGraphRepository, EconomicGraphRepository } from "./economic-graph-repository";

function generateNodeId(tenantId: string, type: EconomicGraphNodeType, sourceEntityId: string): string {
  return `egn:${tenantId}:${type.toLowerCase()}:${sourceEntityId}`;
}

function generateEdgeId(tenantId: string, fromNodeId: string, type: EconomicGraphEdgeType, toNodeId: string): string {
  return `ege:${tenantId}:${fromNodeId}:${type.toLowerCase()}:${toNodeId}`;
}

function ts(): string { return new Date().toISOString(); }

function clampConfidence(c: number) { return Math.min(1, Math.max(0, c)); }

export class EconomicGraphService {
  constructor(private readonly repo: EconomicGraphRepository = economicGraphRepository) {}

  async upsertNode(
    tenantId: string,
    type: EconomicGraphNodeType,
    sourceEntityId: string,
    displayName: string,
    properties: Record<string, unknown> = {},
    confidence = 1.0,
    evidenceRefs: string[] = [],
    source = "economic-graph-service",
  ): Promise<EconomicGraphNode> {
    const id = generateNodeId(tenantId, type, sourceEntityId);
    const now = ts();
    const node: EconomicGraphNode = {
      id, tenantId, type, source, sourceEntityId, canonicalEntityId: id, displayName,
      properties, confidence: clampConfidence(confidence), evidenceRefs,
      createdAt: now, updatedAt: now,
    };
    return this.repo.upsertNode(node);
  }

  async upsertEdge(
    tenantId: string,
    fromNodeId: string,
    toNodeId: string,
    type: EconomicGraphEdgeType,
    source: string,
    confidence = 1.0,
    evidenceRefs: string[] = [],
    properties: Record<string, unknown> = {},
  ): Promise<{ edge: EconomicGraphEdge; created: boolean }> {
    const id = generateEdgeId(tenantId, fromNodeId, type, toNodeId);
    const now = ts();
    const edge: EconomicGraphEdge = {
      id, tenantId, fromNodeId, toNodeId, type, source,
      confidence: clampConfidence(confidence), evidenceRefs, properties,
      createdAt: now, updatedAt: now,
    };
    return this.repo.upsertEdge(edge);
  }

  // Authority linking helpers

  async linkRecommendationToApproval(tenantId: string, recommendationId: string, approvalId: string, evidenceRefs: string[] = []): Promise<void> {
    const rec = await this.upsertNode(tenantId, EconomicGraphNodeType.RECOMMENDATION, recommendationId, `Recommendation:${recommendationId}`, {}, 1.0, evidenceRefs, "approval-authority");
    const app = await this.upsertNode(tenantId, EconomicGraphNodeType.APPROVAL, approvalId, `Approval:${approvalId}`, {}, 1.0, evidenceRefs, "approval-authority");
    await this.upsertEdge(tenantId, rec.id, app.id, EconomicGraphEdgeType.REQUIRES_APPROVAL, "approval-authority", 1.0, evidenceRefs);
  }

  async linkApprovalToAction(tenantId: string, approvalId: string, actionId: string, evidenceRefs: string[] = []): Promise<void> {
    const app = await this.upsertNode(tenantId, EconomicGraphNodeType.APPROVAL, approvalId, `Approval:${approvalId}`, {}, 1.0, evidenceRefs, "approval-authority");
    const act = await this.upsertNode(tenantId, EconomicGraphNodeType.GOVERNED_ACTION, actionId, `GovernedAction:${actionId}`, {}, 1.0, evidenceRefs, "approval-authority");
    await this.upsertEdge(tenantId, app.id, act.id, EconomicGraphEdgeType.APPROVES, "approval-authority", 1.0, evidenceRefs);
  }

  async linkActionToExecution(tenantId: string, actionId: string, executionId: string, evidenceRefs: string[] = []): Promise<void> {
    const act = await this.upsertNode(tenantId, EconomicGraphNodeType.GOVERNED_ACTION, actionId, `GovernedAction:${actionId}`, {}, 1.0, evidenceRefs, "execution-authority");
    const exec = await this.upsertNode(tenantId, EconomicGraphNodeType.EXECUTION, executionId, `Execution:${executionId}`, {}, 1.0, evidenceRefs, "execution-authority");
    await this.upsertEdge(tenantId, act.id, exec.id, EconomicGraphEdgeType.EXECUTES, "execution-authority", 1.0, evidenceRefs);
  }

  async linkExecutionToEvidence(tenantId: string, executionId: string, evidencePackId: string, evidenceRefs: string[] = []): Promise<void> {
    const exec = await this.upsertNode(tenantId, EconomicGraphNodeType.EXECUTION, executionId, `Execution:${executionId}`, {}, 1.0, evidenceRefs, "evidence-authority");
    const ev = await this.upsertNode(tenantId, EconomicGraphNodeType.EVIDENCE_PACK, evidencePackId, `EvidencePack:${evidencePackId}`, {}, 1.0, evidenceRefs, "evidence-authority");
    await this.upsertEdge(tenantId, exec.id, ev.id, EconomicGraphEdgeType.SUPPORTED_BY_EVIDENCE, "evidence-authority", 1.0, evidenceRefs);
  }

  async linkEvidenceToOutcome(tenantId: string, evidencePackId: string, outcomeId: string, evidenceRefs: string[] = []): Promise<void> {
    const ev = await this.upsertNode(tenantId, EconomicGraphNodeType.EVIDENCE_PACK, evidencePackId, `EvidencePack:${evidencePackId}`, {}, 1.0, evidenceRefs, "outcome-authority");
    const out = await this.upsertNode(tenantId, EconomicGraphNodeType.OUTCOME_EVENT, outcomeId, `Outcome:${outcomeId}`, {}, 1.0, evidenceRefs, "outcome-authority");
    await this.upsertEdge(tenantId, ev.id, out.id, EconomicGraphEdgeType.VERIFIES, "outcome-authority", 1.0, evidenceRefs);
  }

  async linkRecommendationToOutcome(tenantId: string, recommendationId: string, outcomeId: string, evidenceRefs: string[] = []): Promise<void> {
    const rec = await this.upsertNode(tenantId, EconomicGraphNodeType.RECOMMENDATION, recommendationId, `Recommendation:${recommendationId}`, {}, 1.0, evidenceRefs, "outcome-authority");
    const out = await this.upsertNode(tenantId, EconomicGraphNodeType.OUTCOME_EVENT, outcomeId, `Outcome:${outcomeId}`, {}, 1.0, evidenceRefs, "outcome-authority");
    await this.upsertEdge(tenantId, rec.id, out.id, EconomicGraphEdgeType.TARGETS, "outcome-authority", 1.0, evidenceRefs);
  }

  // Query delegation
  findNeighbors(tenantId: string, nodeId: string, direction?: NeighborDirection) { return this.repo.findNeighbors(tenantId, nodeId, direction); }
  findPath(tenantId: string, fromNodeId: string, toNodeId: string, maxDepth?: number) { return this.repo.findPath(tenantId, fromNodeId, toNodeId, maxDepth); }
  listNodes(tenantId: string, filters?: GraphNodeFilters) { return this.repo.listNodes(tenantId, filters); }
  listEdges(tenantId: string, filters?: GraphEdgeFilters) { return this.repo.listEdges(tenantId, filters); }
  getNode(tenantId: string, nodeId: string) { return this.repo.getNode(tenantId, nodeId); }
  getEdge(tenantId: string, edgeId: string) { return this.repo.getEdge(tenantId, edgeId); }
  deleteTenantGraph(tenantId: string) { return this.repo.deleteTenantGraph(tenantId); }
}

export const economicGraphService = new EconomicGraphService();
