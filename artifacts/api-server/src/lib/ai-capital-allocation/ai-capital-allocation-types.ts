export type AICapitalAllocationCollection = 'AI_CAPITAL_ALLOCATIONS';

export const AI_CAPITAL_ALLOCATION_COLLECTIONS: AICapitalAllocationCollection[] = ['AI_CAPITAL_ALLOCATIONS'];

export interface PersistenceStore<T extends { id: string; tenantId: string }> {
  upsert(v: T): Promise<T>;
  get(tenantId: string, id: string): Promise<T | undefined>;
  list(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  deleteTenant(tenantId: string): Promise<void>;
  size(): Promise<number>;
}

export type AllocationVerdict = 'INCREASE' | 'MAINTAIN' | 'OPTIMISE' | 'PAUSE' | 'REDUCE' | 'STOP' | 'INSUFFICIENT_DATA';

export type RecommendedAction = 'EXPAND' | 'SUSTAIN' | 'EFFICIENCY_REVIEW' | 'HOLD' | 'SCALE_BACK' | 'TERMINATE' | 'COLLECT_MORE_DATA';

export interface AICapitalAllocation {
  id: string;
  tenantId: string;
  initiativeId: string;
  allocationVerdict: AllocationVerdict;
  recommendedAction: RecommendedAction;
  recommendedInvestmentAmount: number;
  currency?: string;
  currentInvestmentAmount: number;
  attributedValue: number;
  verifiedValue: number;
  protectedValue: number;
  valueToCostRatio: number;
  allocationConfidence: number;
  rationale: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface PortfolioAllocationSummary {
  initiativeCount: number;
  increaseCandidates: number;
  maintainCandidates: number;
  optimiseCandidates: number;
  pauseCandidates: number;
  reduceCandidates: number;
  stopCandidates: number;
  insufficientDataCandidates: number;
  capitalAtRisk: number;
  portfolioConfidence: number;
}

export interface ExecutiveAllocationSummary {
  totalInitiatives: number;
  capitalAtRisk: number;
  increaseCandidates: number;
  optimisationOpportunities: number;
  retirementCandidates: number;
  portfolioConfidence: number;
}
