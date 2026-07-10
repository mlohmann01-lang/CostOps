export type WorkflowValueGraphCollection =
  | 'WORKFLOWS' | 'WORKFLOW_ASSETS' | 'WORKFLOW_PRINCIPALS' | 'WORKFLOW_DECISIONS'
  | 'WORKFLOW_OUTCOMES' | 'WORKFLOW_INVESTMENTS' | 'WORKFLOW_VALUE_SIGNALS';

export const WORKFLOW_VALUE_GRAPH_COLLECTIONS: WorkflowValueGraphCollection[] = [
  'WORKFLOWS', 'WORKFLOW_ASSETS', 'WORKFLOW_PRINCIPALS', 'WORKFLOW_DECISIONS',
  'WORKFLOW_OUTCOMES', 'WORKFLOW_INVESTMENTS', 'WORKFLOW_VALUE_SIGNALS',
];

export interface PersistenceStore<T extends { id: string; tenantId: string }> {
  upsert(v: T): Promise<T>;
  get(tenantId: string, id: string): Promise<T | undefined>;
  list(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  deleteTenant(tenantId: string): Promise<void>;
  size(): Promise<number>;
}

/**
 * A Workflow is not a Business Process. A Workflow is a repeatable sequence of work
 * that consumes resources and produces outcomes (e.g. M365 License Reclamation, Copilot
 * Rollout, Joiner/Mover/Leaver, Invoice Processing, AI Support Agent, Customer Onboarding).
 */
export type WorkflowType = 'BUSINESS' | 'TECHNOLOGY' | 'AI' | 'GOVERNANCE' | 'OPERATIONAL' | 'UNKNOWN';
export type WorkflowStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'UNKNOWN';

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  normalizedName: string;
  description?: string;
  workflowType: WorkflowType;
  status: WorkflowStatus;
  ownerPrincipalId?: string;
  sourceSystem: string;
  sourceReference: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export type WorkflowAssetRelationshipType = 'USES' | 'PRODUCES' | 'OPTIMISES' | 'DEPENDS_ON';
export interface WorkflowAsset {
  id: string;
  tenantId: string;
  workflowId: string;
  assetId: string;
  relationshipType: WorkflowAssetRelationshipType;
  confidence?: number;
  createdAt: string;
}

export type WorkflowPrincipalRelationshipType = 'OWNER' | 'OPERATOR' | 'APPROVER' | 'PARTICIPANT';
export interface WorkflowPrincipal {
  id: string;
  tenantId: string;
  workflowId: string;
  principalId: string;
  relationshipType: WorkflowPrincipalRelationshipType;
  confidence?: number;
  createdAt: string;
}

export type WorkflowDecisionRelationshipType = 'TRIGGERS' | 'EXECUTES' | 'GOVERNS' | 'RELATED';
export interface WorkflowDecision {
  id: string;
  tenantId: string;
  workflowId: string;
  decisionId: string;
  relationshipType: WorkflowDecisionRelationshipType;
  confidence?: number;
  createdAt: string;
}

export type WorkflowOutcomeRelationshipType = 'PRODUCES' | 'PROTECTS' | 'RELATED';
export interface WorkflowOutcome {
  id: string;
  tenantId: string;
  workflowId: string;
  outcomeId: string;
  relationshipType: WorkflowOutcomeRelationshipType;
  confidence?: number;
  createdAt: string;
}

export type WorkflowInvestmentRelationshipType = 'FUNDS' | 'CONSUMES' | 'RELATED';
export interface WorkflowInvestment {
  id: string;
  tenantId: string;
  workflowId: string;
  investmentId: string;
  relationshipType: WorkflowInvestmentRelationshipType;
  confidence?: number;
  createdAt: string;
}

/** Reuses Value Signal from Value Realisation Authority; does not create another value model. */
export interface WorkflowValueSignal {
  id: string;
  tenantId: string;
  workflowId: string;
  valueSignalId: string;
  confidence?: number;
  createdAt: string;
}

export type WorkflowVerdict = 'VALUE_PRODUCING' | 'PARTIAL_VALUE' | 'NO_VERIFIED_VALUE' | 'INSUFFICIENT_EVIDENCE';

export interface WorkflowEvaluation {
  workflowId: string;
  investmentCount: number;
  decisionCount: number;
  outcomeCount: number;
  assetCount: number;
  principalCount: number;
  projectedValue: number;
  verifiedValue: number;
  protectedValue: number;
  confidence: number;
  verdict: WorkflowVerdict;
}

export interface WorkflowGraph {
  workflow: Workflow;
  assets: WorkflowAsset[];
  principals: WorkflowPrincipal[];
  decisions: WorkflowDecision[];
  outcomes: WorkflowOutcome[];
  investments: WorkflowInvestment[];
  valueSignals: WorkflowValueSignal[];
}

export interface WorkflowLineage extends WorkflowGraph {
  evaluation: WorkflowEvaluation;
}
