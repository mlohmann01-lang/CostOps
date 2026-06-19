export type AIInitiativePortfolioCollection =
  | 'AI_INITIATIVES' | 'INITIATIVE_INVESTMENTS' | 'INITIATIVE_WORKFLOWS' | 'INITIATIVE_ATTRIBUTIONS' | 'INITIATIVE_ECONOMICS' | 'INITIATIVE_OUTCOMES' | 'INITIATIVE_PORTFOLIO_EVALUATIONS';

export const AI_INITIATIVE_PORTFOLIO_COLLECTIONS: AIInitiativePortfolioCollection[] = [
  'AI_INITIATIVES', 'INITIATIVE_INVESTMENTS', 'INITIATIVE_WORKFLOWS', 'INITIATIVE_ATTRIBUTIONS', 'INITIATIVE_ECONOMICS', 'INITIATIVE_OUTCOMES', 'INITIATIVE_PORTFOLIO_EVALUATIONS',
];

export interface PersistenceStore<T extends { id: string; tenantId: string }> {
  upsert(v: T): Promise<T>;
  get(tenantId: string, id: string): Promise<T | undefined>;
  list(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  deleteTenant(tenantId: string): Promise<void>;
  size(): Promise<number>;
}

export type AIInitiativeType =
  | 'GEN_AI' | 'COPILOT' | 'AGENT' | 'AUTOMATION' | 'KNOWLEDGE' | 'ANALYTICS' | 'DEVELOPER_PRODUCTIVITY' | 'CUSTOM' | 'UNKNOWN';

export type AIInitiativeStatus = 'PROPOSED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'RETIRED' | 'UNKNOWN';

export interface AIInitiative {
  id: string;
  tenantId: string;
  name: string;
  normalizedName: string;
  description?: string;
  initiativeType: AIInitiativeType;
  status: AIInitiativeStatus;
  ownerPrincipalId?: string;
  businessSponsorPrincipalId?: string;
  sourceSystem: string;
  sourceReference: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface InitiativeInvestmentLink { id: string; tenantId: string; initiativeId: string; investmentId: string; confidence?: number; createdAt: string }
export interface InitiativeWorkflowLink { id: string; tenantId: string; initiativeId: string; workflowId: string; confidence?: number; createdAt: string }
export interface InitiativeAttributionLink { id: string; tenantId: string; initiativeId: string; attributionId: string; confidence?: number; createdAt: string }
export interface InitiativeEconomicsLink { id: string; tenantId: string; initiativeId: string; economicProfileId: string; confidence?: number; createdAt: string }
export interface InitiativeOutcomeLink { id: string; tenantId: string; initiativeId: string; outcomeId: string; confidence?: number; createdAt: string }

export type PortfolioVerdict = 'SCALE' | 'MAINTAIN' | 'OPTIMISE' | 'REVIEW' | 'RETIRE' | 'EXPERIMENT';

export interface InitiativePortfolioEvaluation {
  id: string;
  tenantId: string;
  initiativeId: string;
  attributedValue: number;
  verifiedValue: number;
  protectedValue: number;
  totalSpend: number;
  valueToCostRatio: number;
  economicVerdict: string;
  portfolioVerdict: PortfolioVerdict;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface InitiativePortfolioGraph {
  initiative: AIInitiative;
  investmentLinks: InitiativeInvestmentLink[];
  workflowLinks: InitiativeWorkflowLink[];
  attributionLinks: InitiativeAttributionLink[];
  economicsLinks: InitiativeEconomicsLink[];
  outcomeLinks: InitiativeOutcomeLink[];
}

export interface InitiativeLineage extends InitiativePortfolioGraph {
  evaluation: InitiativePortfolioEvaluation;
}

export interface PortfolioSummary {
  initiativeCount: number;
  scaleCandidates: number;
  maintainCandidates: number;
  optimiseCandidates: number;
  reviewCandidates: number;
  retireCandidates: number;
  experimentCandidates: number;
  portfolioValue: number;
  portfolioSpend: number;
  portfolioEfficiency: number;
}
