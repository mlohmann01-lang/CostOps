import { randomUUID } from 'node:crypto';
import { AIEconomicsRepository, aiEconomicsRepository } from './ai-economics-repository';
import type {
  AICostSignal, AICostType, AIEconomicProfile, AIEconomicProfileGraph, AIEconomicProfileLineage,
  AIEconomicVerdict, AIEconomicsEvaluation, AIEconomicsSummary,
} from './ai-economics-types';

export interface CreateAIEconomicProfileInput {
  tenantId: string;
  investmentId?: string;
  workflowId?: string;
  profileName: string;
  totalSpend?: number;
  currency?: string;
  totalAttributedValue?: number;
  verifiedValue?: number;
  protectedValue?: number;
  economicConfidence?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateAICostSignalInput {
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
  metadata?: Record<string, unknown>;
}

/** Minimal shapes resolved from other authorities; kept loose so this service has no hard dependency on their packages. */
export interface ResolvedAttribution { attributedValueAmount: number; attributionConfidence?: number }

export interface AIEconomicsResolvers {
  /** Workstream 7: AI Economics consumes AIValueAttributionService outputs; it never recomputes attributed value itself. */
  resolveAttribution?(tenantId: string, attributionId: string): Promise<ResolvedAttribution | undefined>;
  /** Workstream 9: additive hook so Value Realisation Authority can absorb AI Economic Efficiency as an evaluation dimension. */
  recordEconomicEfficiency?(tenantId: string, evaluation: AIEconomicsEvaluation): Promise<void>;
}

const HIGH_CONFIDENCE = 0.7;
const LOW_CONFIDENCE = 0.4;

export class AIEconomicsAuthorityService {
  constructor(
    private readonly repo: AIEconomicsRepository = aiEconomicsRepository,
    private readonly resolvers: AIEconomicsResolvers = {},
  ) {}

  async createEconomicProfile(input: CreateAIEconomicProfileInput): Promise<AIEconomicProfile> {
    const now = new Date().toISOString();
    const totalSpend = input.totalSpend ?? 0;
    const totalAttributedValue = input.totalAttributedValue ?? 0;
    const profile: AIEconomicProfile = {
      id: randomUUID(),
      tenantId: input.tenantId,
      investmentId: input.investmentId,
      workflowId: input.workflowId,
      profileName: input.profileName,
      totalSpend,
      currency: input.currency,
      totalAttributedValue,
      verifiedValue: input.verifiedValue ?? 0,
      protectedValue: input.protectedValue ?? 0,
      valueToCostRatio: totalSpend > 0 ? Math.round((totalAttributedValue / totalSpend) * 1000) / 1000 : 0,
      economicConfidence: input.economicConfidence ?? 0.5,
      verdict: 'INSUFFICIENT_DATA',
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };
    return this.repo.upsertProfile(profile);
  }

  async createCostSignal(input: CreateAICostSignalInput): Promise<AICostSignal> {
    const now = new Date().toISOString();
    const signal: AICostSignal = {
      id: randomUUID(),
      tenantId: input.tenantId,
      investmentId: input.investmentId,
      workflowId: input.workflowId,
      provider: input.provider,
      model: input.model,
      costType: input.costType,
      amount: input.amount,
      currency: input.currency,
      measurementPeriod: input.measurementPeriod,
      sourceSystem: input.sourceSystem,
      sourceReference: input.sourceReference,
      confidence: input.confidence,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };
    return this.repo.upsertCostSignal(signal);
  }

  async linkCostSignal(tenantId: string, economicProfileId: string, costSignalId: string, confidence?: number) {
    return this.repo.upsertCostLink({ id: randomUUID(), tenantId, economicProfileId, costSignalId, confidence, createdAt: new Date().toISOString() });
  }

  async linkAttribution(tenantId: string, economicProfileId: string, attributionId: string, confidence?: number) {
    return this.repo.upsertAttributionLink({ id: randomUUID(), tenantId, economicProfileId, attributionId, confidence, createdAt: new Date().toISOString() });
  }

  async linkWorkflow(tenantId: string, economicProfileId: string, workflowId: string, confidence?: number) {
    return this.repo.upsertWorkflowLink({ id: randomUUID(), tenantId, economicProfileId, workflowId, confidence, createdAt: new Date().toISOString() });
  }

  async linkInvestment(tenantId: string, economicProfileId: string, investmentId: string, confidence?: number) {
    return this.repo.upsertInvestmentLink({ id: randomUUID(), tenantId, economicProfileId, investmentId, confidence, createdAt: new Date().toISOString() });
  }

  private async requireProfile(tenantId: string, economicProfileId: string): Promise<AIEconomicProfile> {
    const profile = await this.repo.getProfile(tenantId, economicProfileId);
    if (!profile) throw new Error(`ai economic profile not found: ${economicProfileId}`);
    return profile;
  }

  async getProfileGraph(tenantId: string, economicProfileId: string): Promise<AIEconomicProfileGraph> {
    const profile = await this.requireProfile(tenantId, economicProfileId);
    const [costLinks, attributionLinks, workflowLinks, investmentLinks] = await Promise.all([
      this.repo.listCostLinks(tenantId, { economicProfileId }),
      this.repo.listAttributionLinks(tenantId, { economicProfileId }),
      this.repo.listWorkflowLinks(tenantId, { economicProfileId }),
      this.repo.listInvestmentLinks(tenantId, { economicProfileId }),
    ]);
    const costSignals = (await Promise.all(costLinks.map((l) => this.repo.getCostSignal(tenantId, l.costSignalId)))).filter((s): s is AICostSignal => Boolean(s));
    return { profile, costSignals, costLinks, attributionLinks, workflowLinks, investmentLinks };
  }

  getEconomicProfile(tenantId: string, id: string): Promise<AIEconomicProfile | undefined> {
    return this.repo.getProfile(tenantId, id);
  }

  listEconomicProfiles(tenantId: string, filters: Record<string, unknown> = {}): Promise<AIEconomicProfile[]> {
    return this.repo.listProfiles(tenantId, filters);
  }

  /** Deterministic, no-LLM evaluation. Spend, value, ratio, and verdict are derived purely from linked cost signals and attribution links. */
  async evaluateEconomics(tenantId: string, economicProfileId: string): Promise<AIEconomicsEvaluation> {
    const graph = await this.getProfileGraph(tenantId, economicProfileId);

    const totalSpend = graph.costSignals.reduce((sum, s) => sum + s.amount, 0) || graph.profile.totalSpend;

    const resolvedAttributions = await Promise.all(graph.attributionLinks.map((link) => this.resolvers.resolveAttribution?.(tenantId, link.attributionId)));
    const resolvedValue = resolvedAttributions.reduce((sum, r) => sum + (r?.attributedValueAmount ?? 0), 0);
    const totalAttributedValue = graph.attributionLinks.length > 0 ? resolvedValue : graph.profile.totalAttributedValue;

    const verifiedValue = graph.profile.verifiedValue;
    const protectedValue = graph.profile.protectedValue;

    const valueToCostRatio = totalSpend > 0 ? Math.round((totalAttributedValue / totalSpend) * 1000) / 1000 : 0;
    const protectedValueToCostRatio = totalSpend > 0 ? Math.round((protectedValue / totalSpend) * 1000) / 1000 : 0;

    const confidenceInputs = [
      ...resolvedAttributions.map((r) => r?.attributionConfidence).filter((c): c is number => c !== undefined),
      ...graph.costSignals.map((s) => s.confidence).filter((c): c is number => c !== undefined),
    ];
    const confidence = confidenceInputs.length > 0
      ? Math.round((confidenceInputs.reduce((sum, c) => sum + c, 0) / confidenceInputs.length) * 1000) / 1000
      : graph.profile.economicConfidence;

    let verdict: AIEconomicVerdict;
    if (totalSpend <= 0 || graph.attributionLinks.length === 0) {
      verdict = 'INSUFFICIENT_DATA';
    } else if (totalAttributedValue <= 0) {
      verdict = 'RETIRE';
    } else if (confidence < LOW_CONFIDENCE) {
      verdict = 'REVIEW';
    } else if (valueToCostRatio >= 3 && protectedValue > 0 && confidence >= HIGH_CONFIDENCE) {
      verdict = 'EXPAND';
    } else if (valueToCostRatio < 1) {
      verdict = 'OPTIMISE';
    } else {
      verdict = 'MAINTAIN';
    }

    const evaluation: AIEconomicsEvaluation = {
      economicProfileId,
      totalSpend,
      totalAttributedValue,
      verifiedValue,
      protectedValue,
      valueToCostRatio,
      protectedValueToCostRatio,
      confidence,
      verdict,
    };

    const updated: AIEconomicProfile = {
      ...graph.profile,
      totalSpend,
      totalAttributedValue,
      valueToCostRatio,
      economicConfidence: confidence,
      verdict,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.upsertProfile(updated);
    await this.resolvers.recordEconomicEfficiency?.(tenantId, evaluation);

    return evaluation;
  }

  async getProfileLineage(tenantId: string, economicProfileId: string): Promise<AIEconomicProfileLineage> {
    const graph = await this.getProfileGraph(tenantId, economicProfileId);
    const evaluation = await this.evaluateEconomics(tenantId, economicProfileId);
    return { ...graph, evaluation };
  }

  /** Workstream 8: lets Workflow Value Graph surface AI Economic Efficiency without owning economic linkage itself. */
  async getWorkflowEconomics(tenantId: string, workflowId: string): Promise<{ profileCount: number; totalSpend: number; totalAttributedValue: number; profiles: AIEconomicProfile[] }> {
    const directProfiles = await this.repo.listProfiles(tenantId, { workflowId });
    const links = await this.repo.listWorkflowLinks(tenantId, { workflowId });
    const linkedProfiles = (await Promise.all(links.map((l) => this.repo.getProfile(tenantId, l.economicProfileId)))).filter((p): p is AIEconomicProfile => Boolean(p));
    const profiles = [...directProfiles, ...linkedProfiles].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
    return {
      profileCount: profiles.length,
      totalSpend: profiles.reduce((sum, p) => sum + p.totalSpend, 0),
      totalAttributedValue: profiles.reduce((sum, p) => sum + p.totalAttributedValue, 0),
      profiles,
    };
  }

  /** Workstream 9: lets Value Realisation Authority surface AI Economic Efficiency for an investment without changing existing value logic. */
  async getInvestmentEconomics(tenantId: string, investmentId: string): Promise<{ profileCount: number; totalSpend: number; totalAttributedValue: number; profiles: AIEconomicProfile[] }> {
    const directProfiles = await this.repo.listProfiles(tenantId, { investmentId });
    const links = await this.repo.listInvestmentLinks(tenantId, { investmentId });
    const linkedProfiles = (await Promise.all(links.map((l) => this.repo.getProfile(tenantId, l.economicProfileId)))).filter((p): p is AIEconomicProfile => Boolean(p));
    const profiles = [...directProfiles, ...linkedProfiles].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
    return {
      profileCount: profiles.length,
      totalSpend: profiles.reduce((sum, p) => sum + p.totalSpend, 0),
      totalAttributedValue: profiles.reduce((sum, p) => sum + p.totalAttributedValue, 0),
      profiles,
    };
  }

  /** Workstream 13: pure aggregation reused by the Executive Proof Pack "AI Economics Summary" section. No new proof pack type. */
  async generateEconomicSummary(tenantId: string): Promise<AIEconomicsSummary> {
    const profiles = await this.repo.listProfiles(tenantId);
    const verdictCounts: Record<AIEconomicVerdict, number> = { EXPAND: 0, MAINTAIN: 0, OPTIMISE: 0, REVIEW: 0, RETIRE: 0, INSUFFICIENT_DATA: 0 };
    for (const p of profiles) verdictCounts[p.verdict] += 1;
    const ratios = profiles.map((p) => p.valueToCostRatio);
    const confidences = profiles.map((p) => p.economicConfidence);
    return {
      profileCount: profiles.length,
      totalSpend: profiles.reduce((sum, p) => sum + p.totalSpend, 0),
      totalAttributedValue: profiles.reduce((sum, p) => sum + p.totalAttributedValue, 0),
      totalVerifiedValue: profiles.reduce((sum, p) => sum + p.verifiedValue, 0),
      totalProtectedValue: profiles.reduce((sum, p) => sum + p.protectedValue, 0),
      averageValueToCostRatio: ratios.length ? Math.round((ratios.reduce((sum, r) => sum + r, 0) / ratios.length) * 1000) / 1000 : 0,
      averageConfidence: confidences.length ? Math.round((confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 1000) / 1000 : 0,
      verdictCounts,
    };
  }
}

export const aiEconomicsAuthorityService = new AIEconomicsAuthorityService();
