export const CANONICAL_GRAPH_ENTITY_TYPES = [
  "User","Group","ServiceAccount","SaaSApplication","CloudResource","AIModel","AIEndpoint","MCPServer","Agent","OAuthGrant","Licence","SKU","Contract","Invoice","Department","CostCentre","Policy","Recommendation","ExecutionAction","OutcomeLedgerEntry","DriftEvent","TrustFinding",
] as const;

export type CanonicalGraphEntityType = (typeof CANONICAL_GRAPH_ENTITY_TYPES)[number];

export const CANONICAL_RELATIONSHIP_TYPES = [
  "OWNS","USES","ASSIGNED_TO","AUTHENTICATES_TO","PAYS_FOR","DEPENDS_ON","INTEGRATES_WITH","VIOLATES_POLICY","APPROVED_BY","GENERATED","VERIFIED_BY","DRIFTED_AFTER","EXPOSES_DATA_TO","DUPLICATES","REPLACES",
] as const;
export type CanonicalRelationshipType = (typeof CANONICAL_RELATIONSHIP_TYPES)[number];

export type GraphEvidence = { sourceSystem: string; sourceReferenceId: string; observedAt: string; confidence?: number; details?: Record<string, unknown> };
export type GraphLineage = { lineageId: string; runId?: string; parents?: string[]; capturedAt: string };
