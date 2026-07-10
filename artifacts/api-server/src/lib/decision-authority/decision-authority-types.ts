export type DecisionCollection = 'DECISIONS' | 'DECISION_ASSETS' | 'DECISION_EVIDENCE' | 'DECISION_PRINCIPALS' | 'DECISION_OUTCOMES';
export const DECISION_COLLECTIONS: DecisionCollection[] = ['DECISIONS', 'DECISION_ASSETS', 'DECISION_EVIDENCE', 'DECISION_PRINCIPALS', 'DECISION_OUTCOMES'];

export interface PersistenceStore<T extends { id: string; tenantId: string }> {
  upsert(v: T): Promise<T>;
  get(tenantId: string, id: string): Promise<T | undefined>;
  list(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  deleteTenant(tenantId: string): Promise<void>;
  size(): Promise<number>;
}

export type DecisionType =
  | 'RECOMMENDATION_ACCEPTANCE' | 'RECOMMENDATION_REJECTION' | 'EXECUTION_APPROVAL' | 'EXECUTION_DENIAL'
  | 'RISK_ACCEPTANCE' | 'RENEWAL_REVIEW' | 'OWNERSHIP_ASSIGNMENT' | 'MANUAL_DECISION' | 'SYSTEM_DECISION';

export type DecisionStatus =
  | 'PROPOSED' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'VERIFIED' | 'PROTECTED' | 'SUPERSEDED';

export interface TrustSnapshot {
  trustScore: number;
  trustLevel: string;
  trustSource: string;
  capturedAt: string;
}

export interface OutcomeValueSummary {
  projectedValue?: number;
  executedValue?: number;
  verifiedValue?: number;
  protectedValue?: number;
  currency?: string;
}

export interface Decision {
  id: string;
  tenantId: string;
  decisionType: DecisionType;
  status: DecisionStatus;
  title: string;
  description?: string;
  rationale: string[];
  sourceSystem: string;
  sourceReference: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  executedAt?: string;
  verifiedAt?: string;
  protectedAt?: string;
  primaryAssetId?: string;
  primaryOwnerPrincipalId?: string;
  decisionMakerPrincipalId?: string;
  approverPrincipalId?: string;
  trustSnapshot?: TrustSnapshot;
  outcomeValueSummary?: OutcomeValueSummary;
  metadata: Record<string, unknown>;
}

export type DecisionAssetRelationshipType = 'PRIMARY' | 'IMPACTED' | 'RELATED';
export interface DecisionAsset {
  id: string;
  tenantId: string;
  decisionId: string;
  assetId: string;
  relationshipType: DecisionAssetRelationshipType;
  createdAt: string;
}

export type DecisionEvidenceRelationshipType = 'SUPPORTING' | 'CONTRADICTING' | 'REVIEWED' | 'GENERATED';
export interface DecisionEvidence {
  id: string;
  tenantId: string;
  decisionId: string;
  evidenceItemId: string;
  relationshipType: DecisionEvidenceRelationshipType;
  createdAt: string;
}

export type DecisionPrincipalRole = 'REQUESTER' | 'OWNER' | 'REVIEWER' | 'APPROVER' | 'EXECUTOR' | 'AUDITOR';
export interface DecisionPrincipal {
  id: string;
  tenantId: string;
  decisionId: string;
  principalId: string;
  role: DecisionPrincipalRole;
  createdAt: string;
}

export type DecisionOutcomeRelationshipType = 'EXPECTED' | 'VERIFIED' | 'PROTECTED';
export interface DecisionOutcome {
  id: string;
  tenantId: string;
  decisionId: string;
  outcomeId: string;
  relationshipType: DecisionOutcomeRelationshipType;
  createdAt: string;
}

export interface DecisionLineage {
  decision: Decision;
  assets: DecisionAsset[];
  principals: DecisionPrincipal[];
  evidence: DecisionEvidence[];
  outcomes: DecisionOutcome[];
}
