import type { CanonicalGraphEntityType, CanonicalRelationshipType, GraphEvidence } from "./types";
import { buildLineage } from "./lineage";
import { OperationalGraphRepository } from "./repository";

export class OperationalGraphService {
  constructor(private readonly repo = new OperationalGraphRepository()) {}

  async createNode(params: { tenantId: string; entityType: CanonicalGraphEntityType; canonicalName: string; canonicalKey: string; trustScore?: number; confidenceScore?: number; evidence: GraphEvidence[]; runId?: string; metadata?: Record<string, unknown> }) {
    const lineage = buildLineage(params.runId);
    return this.repo.createNode({
      tenantId: params.tenantId, entityType: params.entityType, canonicalName: params.canonicalName, canonicalKey: params.canonicalKey,
      sourceSystem: params.evidence[0]?.sourceSystem ?? "unknown", entityTrustScore: params.trustScore ?? 0, entityConfidenceScore: params.confidenceScore ?? 0,
      sourceReferences: params.evidence, metadata: { ...(params.metadata ?? {}), lineage },
    });
  }

  async createEdge(params: { tenantId: string; fromEntityId: string; toEntityId: string; relationshipType: CanonicalRelationshipType; confidenceScore: number; trustScore?: number; evidence: GraphEvidence[]; runId?: string; }) {
    const lineage = buildLineage(params.runId);
    return this.repo.createEdge({
      tenantId: params.tenantId, fromEntityId: params.fromEntityId, toEntityId: params.toEntityId, relationshipType: params.relationshipType,
      relationshipConfidenceScore: params.confidenceScore, relationshipTrustScore: params.trustScore ?? params.confidenceScore,
      sourceSystem: params.evidence[0]?.sourceSystem ?? "unknown", sourceReferenceId: params.evidence[0]?.sourceReferenceId ?? "unknown",
      edgeProvenance: { lineage, evidence: params.evidence },
      edgeMetadata: { conflictingTruths: params.evidence.length > 1 },
    });
  }
}
