import { randomUUID } from 'node:crypto';
import { AICapitalAllocationRepository, aiCapitalAllocationRepository } from './ai-capital-allocation-repository';
import { aiInitiativePortfolioService } from '../ai-initiative-portfolio/ai-initiative-portfolio-service';
import type { AICapitalAllocation, AllocationVerdict, ExecutiveAllocationSummary, PortfolioAllocationSummary, RecommendedAction } from './ai-capital-allocation-types';

export interface ResolvedInitiativeLineage {
  initiativeId: string;
  initiativeName: string;
  portfolioVerdict: string;
  economicVerdict: string;
  attributedValue: number;
  verifiedValue: number;
  protectedValue: number;
  totalSpend: number;
  valueToCostRatio: number;
  confidence: number;
}

export interface AICapitalAllocationResolvers {
  /** Workstream 6: capital allocation consumes AIInitiativePortfolioService's lineage; it never recomputes portfolio, economics, or attribution. */
  resolveInitiativeLineage?(tenantId: string, initiativeId: string): Promise<ResolvedInitiativeLineage | undefined>;
  /** Used by portfolio-wide summaries/recommendations to enumerate initiatives without this service owning initiative storage. */
  listInitiatives?(tenantId: string): Promise<Array<{ id: string; name: string }>>;
}

export interface CreateAICapitalAllocationInput {
  tenantId: string;
  initiativeId: string;
  currentInvestmentAmount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

const HIGH_CONFIDENCE = 0.7;
const LOW_CONFIDENCE = 0.4;

export class AICapitalAllocationAuthorityService {
  constructor(
    private readonly repo: AICapitalAllocationRepository = aiCapitalAllocationRepository,
    private readonly resolvers: AICapitalAllocationResolvers = {},
  ) {}

  async createAllocation(input: CreateAICapitalAllocationInput): Promise<AICapitalAllocation> {
    const now = new Date().toISOString();
    const existing = await this.repo.getAllocation(input.tenantId, input.initiativeId);
    const allocation: AICapitalAllocation = {
      id: input.initiativeId,
      tenantId: input.tenantId,
      initiativeId: input.initiativeId,
      allocationVerdict: existing?.allocationVerdict ?? 'INSUFFICIENT_DATA',
      recommendedAction: existing?.recommendedAction ?? 'COLLECT_MORE_DATA',
      recommendedInvestmentAmount: existing?.recommendedInvestmentAmount ?? input.currentInvestmentAmount ?? 0,
      currency: input.currency ?? existing?.currency,
      currentInvestmentAmount: input.currentInvestmentAmount ?? existing?.currentInvestmentAmount ?? 0,
      attributedValue: existing?.attributedValue ?? 0,
      verifiedValue: existing?.verifiedValue ?? 0,
      protectedValue: existing?.protectedValue ?? 0,
      valueToCostRatio: existing?.valueToCostRatio ?? 0,
      allocationConfidence: existing?.allocationConfidence ?? 0.5,
      rationale: existing?.rationale ?? 'Awaiting evaluation.',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
    };
    return this.repo.upsertAllocation(allocation);
  }

  getAllocation(tenantId: string, id: string): Promise<AICapitalAllocation | undefined> { return this.repo.getAllocation(tenantId, id); }
  listAllocations(tenantId: string, filters: Record<string, unknown> = {}): Promise<AICapitalAllocation[]> { return this.repo.listAllocations(tenantId, filters); }

  /** Deterministic, no-LLM allocation engine. Inputs come solely from the resolved initiative lineage (portfolio + economics + attribution), never recomputed here. */
  async evaluateAllocation(tenantId: string, initiativeId: string, currentInvestmentAmount?: number): Promise<AICapitalAllocation> {
    const existing = await this.repo.getAllocation(tenantId, initiativeId);
    const lineage = await this.resolvers.resolveInitiativeLineage?.(tenantId, initiativeId);
    const now = new Date().toISOString();
    const investmentAmount = currentInvestmentAmount ?? existing?.currentInvestmentAmount ?? 0;

    if (!lineage) {
      const allocation: AICapitalAllocation = {
        id: initiativeId,
        tenantId,
        initiativeId,
        allocationVerdict: 'INSUFFICIENT_DATA',
        recommendedAction: 'COLLECT_MORE_DATA',
        recommendedInvestmentAmount: investmentAmount,
        currency: existing?.currency,
        currentInvestmentAmount: investmentAmount,
        attributedValue: 0,
        verifiedValue: 0,
        protectedValue: 0,
        valueToCostRatio: 0,
        allocationConfidence: 0,
        rationale: 'Missing initiative context: no portfolio lineage is available for this initiative.',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        metadata: existing?.metadata ?? {},
      };
      return this.repo.upsertAllocation(allocation);
    }

    const { portfolioVerdict, economicVerdict, attributedValue, verifiedValue, protectedValue, valueToCostRatio, confidence } = lineage;

    let allocationVerdict: AllocationVerdict;
    let recommendedAction: RecommendedAction;
    let rationale: string;

    if (portfolioVerdict === 'EXPERIMENT' || economicVerdict === 'INSUFFICIENT_DATA') {
      allocationVerdict = 'INSUFFICIENT_DATA';
      recommendedAction = 'COLLECT_MORE_DATA';
      rationale = 'Missing attribution or economics evidence: insufficient history to recommend a capital action.';
    } else if (portfolioVerdict === 'SCALE' && economicVerdict === 'EXPAND' && protectedValue > 0 && confidence >= HIGH_CONFIDENCE) {
      allocationVerdict = 'INCREASE';
      recommendedAction = 'EXPAND';
      rationale = `Portfolio verdict SCALE with EXPAND economics, protected value of ${protectedValue} and confidence ${confidence}: increase funding.`;
    } else if (portfolioVerdict === 'MAINTAIN' && (economicVerdict === 'MAINTAIN' || economicVerdict === 'EXPAND')) {
      allocationVerdict = 'MAINTAIN';
      recommendedAction = 'SUSTAIN';
      rationale = `Portfolio verdict MAINTAIN with stable economics (${economicVerdict}): sustain current funding.`;
    } else if (portfolioVerdict === 'OPTIMISE' && attributedValue > 0) {
      allocationVerdict = 'OPTIMISE';
      recommendedAction = 'EFFICIENCY_REVIEW';
      rationale = `Portfolio verdict OPTIMISE: attributed value of ${attributedValue} exists but economics (${economicVerdict}) are weak. Run an efficiency review.`;
    } else if (portfolioVerdict === 'REVIEW' || confidence < LOW_CONFIDENCE) {
      allocationVerdict = 'PAUSE';
      recommendedAction = 'HOLD';
      rationale = `Evidence is incomplete (confidence ${confidence}): hold further capital decisions pending stronger evidence.`;
    } else if (portfolioVerdict === 'RETIRE' && attributedValue > 0) {
      allocationVerdict = 'REDUCE';
      recommendedAction = 'SCALE_BACK';
      rationale = `Portfolio verdict RETIRE but residual attributed value of ${attributedValue} remains: scale back funding rather than terminate.`;
    } else if (attributedValue <= 0 && lineage.totalSpend > 0 && confidence >= HIGH_CONFIDENCE) {
      allocationVerdict = 'STOP';
      recommendedAction = 'TERMINATE';
      rationale = `No attributed value despite ongoing spend of ${lineage.totalSpend} and strong evidence (confidence ${confidence}): terminate funding.`;
    } else {
      allocationVerdict = 'MAINTAIN';
      recommendedAction = 'SUSTAIN';
      rationale = `No stronger signal applies (portfolio ${portfolioVerdict}, economics ${economicVerdict}): sustain current funding.`;
    }

    const recommendedInvestmentAmount = this.recommendedAmount(allocationVerdict, investmentAmount);

    const allocation: AICapitalAllocation = {
      id: initiativeId,
      tenantId,
      initiativeId,
      allocationVerdict,
      recommendedAction,
      recommendedInvestmentAmount,
      currency: existing?.currency,
      currentInvestmentAmount: investmentAmount,
      attributedValue,
      verifiedValue,
      protectedValue,
      valueToCostRatio,
      allocationConfidence: confidence,
      rationale,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      metadata: existing?.metadata ?? {},
    };
    return this.repo.upsertAllocation(allocation);
  }

  private recommendedAmount(verdict: AllocationVerdict, currentAmount: number): number {
    switch (verdict) {
      case 'INCREASE': return Math.round(currentAmount * 1.5 * 100) / 100;
      case 'REDUCE': return Math.round(currentAmount * 0.5 * 100) / 100;
      case 'STOP': return 0;
      default: return currentAmount;
    }
  }

  async getInitiativeAllocation(tenantId: string, initiativeId: string): Promise<AICapitalAllocation> {
    return this.evaluateAllocation(tenantId, initiativeId);
  }

  private async evaluateAllInitiatives(tenantId: string): Promise<AICapitalAllocation[]> {
    const initiatives = (await this.resolvers.listInitiatives?.(tenantId)) ?? [];
    return Promise.all(initiatives.map((i) => this.evaluateAllocation(tenantId, i.id)));
  }

  async getPortfolioAllocationSummary(tenantId: string): Promise<PortfolioAllocationSummary> {
    const allocations = await this.evaluateAllInitiatives(tenantId);
    const countBy = (v: AllocationVerdict) => allocations.filter((a) => a.allocationVerdict === v).length;
    const capitalAtRisk = allocations
      .filter((a) => a.allocationVerdict === 'REDUCE' || a.allocationVerdict === 'STOP' || a.allocationVerdict === 'PAUSE')
      .reduce((sum, a) => sum + a.currentInvestmentAmount, 0);
    const confidences = allocations.map((a) => a.allocationConfidence);
    return {
      initiativeCount: allocations.length,
      increaseCandidates: countBy('INCREASE'),
      maintainCandidates: countBy('MAINTAIN'),
      optimiseCandidates: countBy('OPTIMISE'),
      pauseCandidates: countBy('PAUSE'),
      reduceCandidates: countBy('REDUCE'),
      stopCandidates: countBy('STOP'),
      insufficientDataCandidates: countBy('INSUFFICIENT_DATA'),
      capitalAtRisk,
      portfolioConfidence: confidences.length ? Math.round((confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 1000) / 1000 : 0,
    };
  }

  async getCapitalAllocationRecommendations(tenantId: string, limit = 10): Promise<AICapitalAllocation[]> {
    const allocations = await this.evaluateAllInitiatives(tenantId);
    const priority: Record<AllocationVerdict, number> = { INCREASE: 0, STOP: 1, REDUCE: 2, OPTIMISE: 3, PAUSE: 4, MAINTAIN: 5, INSUFFICIENT_DATA: 6 };
    return allocations
      .sort((a, b) => priority[a.allocationVerdict] - priority[b.allocationVerdict] || b.attributedValue - a.attributedValue)
      .slice(0, limit);
  }

  async generateExecutiveAllocationSummary(tenantId: string): Promise<ExecutiveAllocationSummary> {
    const summary = await this.getPortfolioAllocationSummary(tenantId);
    return {
      totalInitiatives: summary.initiativeCount,
      capitalAtRisk: summary.capitalAtRisk,
      increaseCandidates: summary.increaseCandidates,
      optimisationOpportunities: summary.optimiseCandidates,
      retirementCandidates: summary.reduceCandidates + summary.stopCandidates,
      portfolioConfidence: summary.portfolioConfidence,
    };
  }
}

// Wires capital allocation to AIInitiativePortfolioService's lineage (Workstream 6):
// without this, resolveInitiativeLineage/listInitiatives are undefined and every
// evaluation falls into the "no lineage available" INSUFFICIENT_DATA path even when
// the initiative has real portfolio/economics/attribution history.
export const aiCapitalAllocationAuthorityService = new AICapitalAllocationAuthorityService(aiCapitalAllocationRepository, {
  async resolveInitiativeLineage(tenantId, initiativeId) {
    const initiative = await aiInitiativePortfolioService.getInitiative(tenantId, initiativeId);
    if (!initiative) return undefined;
    const evaluation = await aiInitiativePortfolioService.evaluateInitiative(tenantId, initiativeId);
    return {
      initiativeId,
      initiativeName: initiative.name,
      portfolioVerdict: evaluation.portfolioVerdict,
      economicVerdict: evaluation.economicVerdict,
      attributedValue: evaluation.attributedValue,
      verifiedValue: evaluation.verifiedValue,
      protectedValue: evaluation.protectedValue,
      totalSpend: evaluation.totalSpend,
      valueToCostRatio: evaluation.valueToCostRatio,
      confidence: evaluation.confidence,
    };
  },
  async listInitiatives(tenantId) {
    const initiatives = await aiInitiativePortfolioService.listInitiatives(tenantId);
    return initiatives.map((initiative) => ({ id: initiative.id, name: initiative.name }));
  },
});
