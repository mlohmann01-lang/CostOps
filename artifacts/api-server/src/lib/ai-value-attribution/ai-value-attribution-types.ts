export type AIValueAttributionCollection =
  | 'AI_ACTIVITIES' | 'AI_VALUE_ATTRIBUTIONS' | 'AI_ACTIVITY_VALUE_SIGNALS' | 'AI_ACTIVITY_OUTCOMES' | 'AI_ACTIVITY_DECISIONS' | 'AI_ACTIVITY_WORKFLOWS';

export const AI_VALUE_ATTRIBUTION_COLLECTIONS: AIValueAttributionCollection[] = [
  'AI_ACTIVITIES', 'AI_VALUE_ATTRIBUTIONS', 'AI_ACTIVITY_VALUE_SIGNALS', 'AI_ACTIVITY_OUTCOMES', 'AI_ACTIVITY_DECISIONS', 'AI_ACTIVITY_WORKFLOWS',
];

export interface PersistenceStore<T extends { id: string; tenantId: string }> {
  upsert(v: T): Promise<T>;
  get(tenantId: string, id: string): Promise<T | undefined>;
  list(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  deleteTenant(tenantId: string): Promise<void>;
  size(): Promise<number>;
}

/**
 * AI Value Attribution is NOT AI observability, model telemetry, prompt analytics,
 * agent monitoring, cost tracking, or token accounting. Those may contribute evidence.
 * The product is: AI Activity -> Value Creation.
 */
export type AIActivityType = 'CHAT' | 'SEARCH' | 'SUMMARISATION' | 'GENERATION' | 'CODING' | 'ANALYSIS' | 'AUTOMATION' | 'CLASSIFICATION' | 'OTHER' | 'UNKNOWN';

export interface AIActivity {
  id: string;
  tenantId: string;
  workflowId?: string;
  activityType: AIActivityType;
  activityName: string;
  provider?: string;
  model?: string;
  agent?: string;
  sourceSystem: string;
  sourceReference: string;
  usageCount?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export type AIAttributionType = 'TIME_SAVED' | 'PRODUCTIVITY_GAIN' | 'QUALITY_IMPROVEMENT' | 'COST_AVOIDANCE' | 'RISK_REDUCTION' | 'USER_ADOPTION' | 'OUTPUT_GENERATION' | 'KNOWLEDGE_REUSE' | 'OTHER' | 'UNKNOWN';
export type AIAttributionMethod = 'DIRECT_EVIDENCE' | 'WORKFLOW_EVIDENCE' | 'OUTCOME_EVIDENCE' | 'DECISION_EVIDENCE' | 'MANUAL' | 'SYSTEM_INFERRED' | 'UNKNOWN';

export interface AIValueAttribution {
  id: string;
  tenantId: string;
  activityId?: string;
  workflowId?: string;
  investmentId?: string;
  assetId?: string;
  valueSignalId?: string;
  decisionId?: string;
  outcomeId?: string;
  attributionType: AIAttributionType;
  attributionMethod: AIAttributionMethod;
  attributedValueAmount: number;
  attributedValueCurrency?: string;
  attributionConfidence?: number;
  evidenceItemId?: string;
  sourceSystem: string;
  sourceReference: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface AIActivityValueSignal {
  id: string;
  tenantId: string;
  activityId: string;
  valueSignalId: string;
  confidence?: number;
  createdAt: string;
}

export interface AIActivityOutcome {
  id: string;
  tenantId: string;
  activityId: string;
  outcomeId: string;
  confidence?: number;
  createdAt: string;
}

export interface AIActivityDecision {
  id: string;
  tenantId: string;
  activityId: string;
  decisionId: string;
  confidence?: number;
  createdAt: string;
}

export interface AIActivityWorkflow {
  id: string;
  tenantId: string;
  activityId: string;
  workflowId: string;
  confidence?: number;
  createdAt: string;
}

export type AIValueAttributionVerdict = 'ATTRIBUTED' | 'PARTIALLY_ATTRIBUTED' | 'INSUFFICIENT_EVIDENCE' | 'UNATTRIBUTED';

export interface AIValueAttributionEvaluation {
  activityId: string;
  totalAttributedValue: number;
  directEvidenceValue: number;
  workflowEvidenceValue: number;
  outcomeEvidenceValue: number;
  confidence: number;
  verdict: AIValueAttributionVerdict;
}

export interface AIActivityGraph {
  activity: AIActivity;
  attributions: AIValueAttribution[];
  valueSignals: AIActivityValueSignal[];
  outcomes: AIActivityOutcome[];
  decisions: AIActivityDecision[];
  workflows: AIActivityWorkflow[];
}

export interface AIActivityLineage extends AIActivityGraph {
  evaluation: AIValueAttributionEvaluation;
}

export interface AIValueSummary {
  activityCount: number;
  attributionCount: number;
  totalAttributedValue: number;
  averageConfidence: number;
  linkedWorkflowIds: string[];
  linkedOutcomeIds: string[];
  evidenceCount: number;
}
