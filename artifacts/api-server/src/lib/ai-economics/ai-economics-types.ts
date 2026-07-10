export type AIEconomicsCollection =
  | 'AI_ECONOMIC_PROFILES' | 'AI_COST_SIGNALS' | 'AI_ECONOMIC_COSTS' | 'AI_ECONOMIC_ATTRIBUTIONS' | 'AI_ECONOMIC_WORKFLOWS' | 'AI_ECONOMIC_INVESTMENTS';

export const AI_ECONOMICS_COLLECTIONS: AIEconomicsCollection[] = [
  'AI_ECONOMIC_PROFILES', 'AI_COST_SIGNALS', 'AI_ECONOMIC_COSTS', 'AI_ECONOMIC_ATTRIBUTIONS', 'AI_ECONOMIC_WORKFLOWS', 'AI_ECONOMIC_INVESTMENTS',
];

export interface PersistenceStore<T extends { id: string; tenantId: string }> {
  upsert(v: T): Promise<T>;
  get(tenantId: string, id: string): Promise<T | undefined>;
  list(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  deleteTenant(tenantId: string): Promise<void>;
  size(): Promise<number>;
}

/**
 * AI Economics Authority is NOT AI FinOps, billing analytics, token optimization, a cost
 * dashboard, or a budgeting/procurement platform. Those are inputs. The product is:
 * Spend -> Value -> Efficiency -> Capital Decision.
 */
export type AIEconomicVerdict = 'EXPAND' | 'MAINTAIN' | 'OPTIMISE' | 'REVIEW' | 'RETIRE' | 'INSUFFICIENT_DATA';

export interface AIEconomicProfile {
  id: string;
  tenantId: string;
  investmentId?: string;
  workflowId?: string;
  profileName: string;
  totalSpend: number;
  currency?: string;
  totalAttributedValue: number;
  verifiedValue: number;
  protectedValue: number;
  valueToCostRatio: number;
  economicConfidence: number;
  verdict: AIEconomicVerdict;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export type AICostType = 'SUBSCRIPTION' | 'TOKEN_USAGE' | 'INFERENCE' | 'AGENT_RUNTIME' | 'LICENSING' | 'INFRASTRUCTURE' | 'MANUAL' | 'UNKNOWN';

export interface AICostSignal {
  id: string;
  tenantId: string;
  investmentId?: string;
  workflowId?: string;
  provider?: string;
  model?: string;
  costType: AICostType;
  amount: number;
  currency?: string;
  measurementPeriod?: string;
  sourceSystem: string;
  sourceReference: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface AIEconomicCostLink {
  id: string;
  tenantId: string;
  economicProfileId: string;
  costSignalId: string;
  confidence?: number;
  createdAt: string;
}

export interface AIEconomicAttributionLink {
  id: string;
  tenantId: string;
  economicProfileId: string;
  attributionId: string;
  confidence?: number;
  createdAt: string;
}

export interface AIEconomicWorkflowLink {
  id: string;
  tenantId: string;
  economicProfileId: string;
  workflowId: string;
  confidence?: number;
  createdAt: string;
}

export interface AIEconomicInvestmentLink {
  id: string;
  tenantId: string;
  economicProfileId: string;
  investmentId: string;
  confidence?: number;
  createdAt: string;
}

export interface AIEconomicsEvaluation {
  economicProfileId: string;
  totalSpend: number;
  totalAttributedValue: number;
  verifiedValue: number;
  protectedValue: number;
  valueToCostRatio: number;
  protectedValueToCostRatio: number;
  confidence: number;
  verdict: AIEconomicVerdict;
}

export interface AIEconomicProfileGraph {
  profile: AIEconomicProfile;
  costSignals: AICostSignal[];
  costLinks: AIEconomicCostLink[];
  attributionLinks: AIEconomicAttributionLink[];
  workflowLinks: AIEconomicWorkflowLink[];
  investmentLinks: AIEconomicInvestmentLink[];
}

export interface AIEconomicProfileLineage extends AIEconomicProfileGraph {
  evaluation: AIEconomicsEvaluation;
}

export interface AIEconomicsSummary {
  profileCount: number;
  totalSpend: number;
  totalAttributedValue: number;
  totalVerifiedValue: number;
  totalProtectedValue: number;
  averageValueToCostRatio: number;
  averageConfidence: number;
  verdictCounts: Record<AIEconomicVerdict, number>;
}
