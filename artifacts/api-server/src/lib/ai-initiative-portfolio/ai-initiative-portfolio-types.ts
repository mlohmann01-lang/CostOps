export type AIInitiativePortfolioCollection =
  | 'AI_INITIATIVES' | 'INITIATIVE_INVESTMENTS' | 'INITIATIVE_WORKFLOWS' | 'INITIATIVE_ATTRIBUTIONS' | 'INITIATIVE_ECONOMICS' | 'INITIATIVE_OUTCOMES' | 'INITIATIVE_PORTFOLIO_EVALUATIONS'
  | 'INITIATIVE_ASSETS' | 'INITIATIVE_OBJECTIVES';

export const AI_INITIATIVE_PORTFOLIO_COLLECTIONS: AIInitiativePortfolioCollection[] = [
  'AI_INITIATIVES', 'INITIATIVE_INVESTMENTS', 'INITIATIVE_WORKFLOWS', 'INITIATIVE_ATTRIBUTIONS', 'INITIATIVE_ECONOMICS', 'INITIATIVE_OUTCOMES', 'INITIATIVE_PORTFOLIO_EVALUATIONS',
  'INITIATIVE_ASSETS', 'INITIATIVE_OBJECTIVES',
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

// Program AI2 — Capability 7: lifecycle maturity states, distinct from the
// pre-existing economics-oriented `AIInitiativeStatus`. Kept as a separate
// optional field so the AI2 governance/recommendation logic does not disturb
// the existing spend-based evaluation behaviour or its tests.
export type AIInitiativeLifecycle =
  | 'PROPOSED' | 'APPROVED' | 'PILOT' | 'SCALING' | 'OPERATIONAL' | 'REVIEW' | 'RETIRED';

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
  // AI2 additions — additive/optional, no fabricated defaults.
  lifecycle?: AIInitiativeLifecycle;
  ownerName?: string;
  executiveSponsor?: string;
  department?: string;
  costCentre?: string;
  objectiveIds?: string[];
  assetIds?: string[];
  tags?: string[];
  retiredAt?: string;
}

export interface InitiativeInvestmentLink { id: string; tenantId: string; initiativeId: string; investmentId: string; confidence?: number; createdAt: string }
export interface InitiativeWorkflowLink { id: string; tenantId: string; initiativeId: string; workflowId: string; confidence?: number; createdAt: string }
export interface InitiativeAttributionLink { id: string; tenantId: string; initiativeId: string; attributionId: string; confidence?: number; createdAt: string }
export interface InitiativeEconomicsLink { id: string; tenantId: string; initiativeId: string; economicProfileId: string; confidence?: number; createdAt: string }
export interface InitiativeOutcomeLink { id: string; tenantId: string; initiativeId: string; outcomeId: string; confidence?: number; createdAt: string }
export interface InitiativeAssetLink { id: string; tenantId: string; initiativeId: string; assetId: string; createdAt: string }
export interface InitiativeObjectiveLink { id: string; tenantId: string; initiativeId: string; objectiveId: string; createdAt: string }

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

// ---------------------------------------------------------------------------
// Program AI2 — AI Initiative Portfolio Management Completion.
// ---------------------------------------------------------------------------

export interface InitiativeOwnershipEvaluation {
  initiativeId: string;
  hasOwner: boolean;
  hasExecutiveSponsor: boolean;
  hasDepartment: boolean;
  hasCostCentre: boolean;
  complete: boolean;
  missing: string[];
}

export type InitiativeConfidenceLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERIFIED';

export interface InitiativeConfidenceResult {
  initiativeId: string;
  level: InitiativeConfidenceLevel;
  score: number;
  attributionCount: number;
  averageAttributionConfidence: number;
  evidenceQualityRatio: number;
  outcomeStabilityRatio: number;
  reasoning: string;
}

export interface InitiativeOutcomeSummary {
  initiativeId: string;
  attributionCount: number;
  outcomeCount: number;
  assetCount: number;
  evidenceCount: number;
  completeLineageRatio: number;
}

export interface InitiativeValueSummary {
  initiativeId: string;
  name: string;
  assetNames: string[];
  outcomeCount: number;
  confidenceLevel: InitiativeConfidenceLevel;
  valueSignalCount: number;
  valueEstimate: number | 'UNKNOWN';
}

export type InitiativeRecommendationAction = 'EXPAND' | 'KEEP' | 'OPTIMISE' | 'REVIEW' | 'RETIRE';

export interface InitiativeRecommendation {
  initiativeId: string;
  action: InitiativeRecommendationAction;
  reasoning: string;
}

export interface LifecycleTransitionCheck {
  allowed: boolean;
  reason?: string;
}

export type AIInitiativePortfolioAuthorityVerdict = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface AIInitiativePortfolioAuthorityResult {
  authority: 'AI_INITIATIVE_PORTFOLIO_AUTHORITY';
  tenantId: string;
  verdict: AIInitiativePortfolioAuthorityVerdict;
  score: number;
  coverage: { assetCount: number; assetsInInitiatives: number; ratio: number };
  ownership: { initiativeCount: number; ownedInitiatives: number; ratio: number };
  outcomeCoverage: { initiativeCount: number; initiativesWithOutcomes: number; ratio: number };
  confidence: { averageScore: number };
  governance: { initiativeCount: number; lifecycleCompliant: number; ratio: number };
  reasoning: string;
}

export interface ExecutivePortfolioView {
  tenantId: string;
  totalInitiatives: number;
  activeInitiatives: number;
  scalingInitiatives: number;
  initiativesWithOutcomes: number;
  initiativesWithEvidenceBackedValue: number;
  retiredInitiatives: number;
}
