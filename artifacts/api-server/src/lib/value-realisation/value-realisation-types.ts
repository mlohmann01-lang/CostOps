export type ValueRealisationCollection =
  | 'INVESTMENTS' | 'BUSINESS_CAPABILITIES' | 'INVESTMENT_CAPABILITIES'
  | 'INVESTMENT_ASSETS' | 'INVESTMENT_DECISIONS' | 'VALUE_SIGNALS' | 'VALUE_ATTRIBUTIONS';

export const VALUE_REALISATION_COLLECTIONS: ValueRealisationCollection[] = [
  'INVESTMENTS', 'BUSINESS_CAPABILITIES', 'INVESTMENT_CAPABILITIES',
  'INVESTMENT_ASSETS', 'INVESTMENT_DECISIONS', 'VALUE_SIGNALS', 'VALUE_ATTRIBUTIONS',
];

export interface PersistenceStore<T extends { id: string; tenantId: string }> {
  upsert(v: T): Promise<T>;
  get(tenantId: string, id: string): Promise<T | undefined>;
  list(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  deleteTenant(tenantId: string): Promise<void>;
  size(): Promise<number>;
}

export type InvestmentType = 'AI' | 'SAAS' | 'CLOUD' | 'LICENSING' | 'PLATFORM' | 'DATA' | 'SECURITY' | 'INFRASTRUCTURE' | 'OTHER' | 'UNKNOWN';
export type InvestmentStatus = 'PROPOSED' | 'ACTIVE' | 'UNDER_REVIEW' | 'VALUE_CONFIRMED' | 'VALUE_NOT_CONFIRMED' | 'OPTIMISE' | 'RETIRE' | 'UNKNOWN';

export interface Investment {
  id: string;
  tenantId: string;
  name: string;
  normalizedName: string;
  description?: string;
  investmentType: InvestmentType;
  status: InvestmentStatus;
  sourceSystem: string;
  sourceReference: string;
  ownerPrincipalId?: string;
  sponsorPrincipalId?: string;
  startDate?: string;
  endDate?: string;
  expectedValueAmount?: number;
  expectedValueCurrency?: string;
  actualSpendAmount?: number;
  actualSpendCurrency?: string;
  valueHypothesis?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export type CapabilityType = 'BUSINESS' | 'TECHNOLOGY' | 'AI' | 'OPERATIONAL' | 'RISK' | 'CUSTOMER' | 'UNKNOWN';

export interface BusinessCapability {
  id: string;
  tenantId: string;
  name: string;
  normalizedName: string;
  description?: string;
  capabilityType: CapabilityType;
  ownerPrincipalId?: string;
  parentCapabilityId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export type InvestmentCapabilityRelationshipType = 'SUPPORTS' | 'ENABLES' | 'FUNDS' | 'DEPENDS_ON' | 'UNKNOWN';

export interface InvestmentCapability {
  id: string;
  tenantId: string;
  investmentId: string;
  capabilityId: string;
  relationshipType: InvestmentCapabilityRelationshipType;
  confidence?: number;
  sourceSystem?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type InvestmentAssetRelationshipType = 'CREATES' | 'FUNDS' | 'USES' | 'OPTIMISES' | 'GOVERNED_BY' | 'UNKNOWN';

export interface InvestmentAsset {
  id: string;
  tenantId: string;
  investmentId: string;
  assetId: string;
  relationshipType: InvestmentAssetRelationshipType;
  confidence?: number;
  sourceSystem?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface InvestmentDecision {
  id: string;
  tenantId: string;
  investmentId: string;
  decisionId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type ValueSignalType = 'COST_SAVING' | 'TIME_SAVED' | 'PRODUCTIVITY_GAIN' | 'RISK_REDUCTION' | 'UTILISATION_IMPROVEMENT' | 'PROCESS_EFFICIENCY' | 'LICENSE_RECLAIM' | 'AI_OUTPUT_VALUE' | 'USER_ADOPTION' | 'MANUAL' | 'UNKNOWN';
export type ValueSignalDirection = 'INCREASE_IS_GOOD' | 'DECREASE_IS_GOOD' | 'TARGET_IS_GOOD' | 'UNKNOWN';

export interface ValueSignal {
  id: string;
  tenantId: string;
  investmentId: string;
  capabilityId?: string;
  assetId?: string;
  signalType: ValueSignalType;
  signalName: string;
  signalDirection: ValueSignalDirection;
  measurementUnit?: string;
  baselineValue?: number;
  currentValue?: number;
  targetValue?: number;
  verifiedValue?: number;
  confidence?: number;
  evidenceItemId?: string;
  collectedAt?: string;
  sourceSystem?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ValueAttributionType = 'PROJECTED' | 'EXECUTED' | 'VERIFIED' | 'PROTECTED' | 'AVOIDED_COST' | 'PRODUCTIVITY' | 'RISK_REDUCTION' | 'UNKNOWN';
export type ValueAttributionMethod = 'OUTCOME_LEDGER' | 'VERIFIED_SAVINGS' | 'EVIDENCE_BASED' | 'MANUAL' | 'SYSTEM_INFERRED' | 'UNKNOWN';

export interface ValueAttribution {
  id: string;
  tenantId: string;
  investmentId: string;
  outcomeId?: string;
  decisionId?: string;
  evidenceItemId?: string;
  attributionType: ValueAttributionType;
  attributedValueAmount: number;
  attributedValueCurrency?: string;
  attributionConfidence?: number;
  attributionMethod: ValueAttributionMethod;
  attributionSummary?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export type InvestmentVerdict = 'VALUE_CONFIRMED' | 'PARTIAL_VALUE_CONFIRMED' | 'VALUE_NOT_CONFIRMED' | 'INSUFFICIENT_EVIDENCE' | 'NEEDS_REVIEW';

export interface InvestmentValueEvaluation {
  investmentId: string;
  totalProjectedValue: number;
  totalExecutedValue: number;
  totalVerifiedValue: number;
  totalProtectedValue: number;
  evidenceCount: number;
  decisionCount: number;
  outcomeCount: number;
  protectedOutcomeCount: number;
  valueRealisationRatio: number;
  confidence: number;
  verdict: InvestmentVerdict;
}

export interface InvestmentLineage {
  investment: Investment;
  capabilities: InvestmentCapability[];
  assets: InvestmentAsset[];
  decisions: InvestmentDecision[];
  signals: ValueSignal[];
  attributions: ValueAttribution[];
  evaluation: InvestmentValueEvaluation;
}
