export type AIValueAttributionCollection =
  | 'AI_ACTIVITIES' | 'AI_VALUE_ATTRIBUTIONS' | 'AI_ACTIVITY_VALUE_SIGNALS' | 'AI_ACTIVITY_OUTCOMES' | 'AI_ACTIVITY_DECISIONS' | 'AI_ACTIVITY_WORKFLOWS'
  // Program AI1 — additive collections for multi-source contributors and the evidence registry. Stored in the same generic record table as the collections above (see ai-value-attribution-persistence.ts); no new table, no parallel registry.
  | 'AI_ATTRIBUTION_CONTRIBUTORS' | 'AI_ATTRIBUTION_EVIDENCE';

export const AI_VALUE_ATTRIBUTION_COLLECTIONS: AIValueAttributionCollection[] = [
  'AI_ACTIVITIES', 'AI_VALUE_ATTRIBUTIONS', 'AI_ACTIVITY_VALUE_SIGNALS', 'AI_ACTIVITY_OUTCOMES', 'AI_ACTIVITY_DECISIONS', 'AI_ACTIVITY_WORKFLOWS',
  'AI_ATTRIBUTION_CONTRIBUTORS', 'AI_ATTRIBUTION_EVIDENCE',
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
  // Program AI1 — confidence-engine outputs, computed by computeAttributionConfidence()
  // and persisted via AIValueAttributionService.recomputeConfidence(). Optional and
  // additive: existing attributions and consumers (executive proof packs, database
  // tenant isolation authority) are unaffected until this is populated.
  confidenceScore?: number;
  confidenceLevel?: AttributionConfidenceLevel;
  confidenceReasoning?: string;
}

// ─── Program AI1 — Attribution Confidence Engine ───────────────────────────

export type AttributionConfidenceLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERIFIED';

export type AttributionEvidenceStrength = 'OBSERVED' | 'INFERRED' | 'ESTIMATED' | 'VERIFIED';

export interface AttributionConfidenceInputs {
  /** One entry per evidence item bound to the attribution. */
  evidenceStrengths: AttributionEvidenceStrength[];
  /** Distinct source systems across evidence + contributors, e.g. ["copilot", "servicenow", "workflow-engine"]. */
  distinctSourceCount: number;
  /** True when the underlying outcome/value signal has shown consistent values across observations; false when volatile; undefined when unknown (treated as neutral). */
  signalStable?: boolean;
  /** Hours between the latest evidence timestamp and the outcome's observed timestamp; smaller is stronger time correlation. Undefined when unknown (treated as neutral). */
  timeCorrelationHours?: number;
}

export interface AttributionConfidenceResult {
  score: number;
  level: AttributionConfidenceLevel;
  reasoning: string;
}

// ─── Program AI1 — Multi-Source Attribution ────────────────────────────────

export type AttributionContributorType = 'ASSET' | 'AGENT' | 'WORKFLOW' | 'HUMAN' | 'CONNECTOR';

export interface AttributionContributor {
  id: string;
  tenantId: string;
  attributionId: string;
  contributorType: AttributionContributorType;
  contributorId: string;
  label?: string;
  /** Percentage points, 0-100. All contributors for one attributionId must sum to exactly 100 — enforced by AIValueAttributionService.setContributors(). */
  weight: number;
  createdAt: string;
}

// ─── Program AI1 — Attribution Evidence Registry ───────────────────────────

export type AttributionEvidenceType =
  | 'AI_USAGE' | 'WORKFLOW_EXECUTION' | 'SYSTEM_EVENT' | 'BUSINESS_METRIC' | 'HUMAN_CONFIRMATION' | 'EXECUTIVE_VALIDATION';

export interface AttributionEvidenceRecord {
  id: string;
  tenantId: string;
  attributionId: string;
  evidenceType: AttributionEvidenceType;
  evidenceStrength: AttributionEvidenceStrength;
  source: string;
  timestamp: string;
  /** How much this single item contributes to overall confidence, 0-1. Informational; the authoritative score comes from computeAttributionConfidence(). */
  confidenceContribution?: number;
  description?: string;
  createdAt: string;
}

// ─── Program AI1 — Attribution Lineage ──────────────────────────────────────

export interface AttributionLineage {
  attributionId: string;
  tenantId: string;
  activity?: AIActivity;
  evidence: AttributionEvidenceRecord[];
  attribution: AIValueAttribution;
  contributors: AttributionContributor[];
  outcomeId?: string;
  valueSignalId?: string;
  /** Resolved by matching the attribution's assetId against BusinessObjective.linkedAssetIds (src/lib/economic-outcomes). Empty when no resolver is wired or no match exists — never fabricated. */
  objectiveIds: string[];
  complete: boolean;
}

// ─── Program AI1 — Attribution Decision Framework ──────────────────────────

export type AttributionRecommendationVerdict = 'INSUFFICIENT_EVIDENCE' | 'REVIEW' | 'EXPAND' | 'KEEP' | 'OPTIMISE' | 'RETIRE';

export interface AttributionRecommendation {
  attributionId: string;
  verdict: AttributionRecommendationVerdict;
  reasoning: string;
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
