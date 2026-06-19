import { randomUUID } from 'node:crypto';
import { AIInitiativePortfolioRepository, aiInitiativePortfolioRepository } from './ai-initiative-portfolio-repository';
import type {
  AIInitiative, AIInitiativeStatus, AIInitiativeType, InitiativeLineage, InitiativePortfolioEvaluation,
  InitiativePortfolioGraph, PortfolioSummary, PortfolioVerdict,
} from './ai-initiative-portfolio-types';

export interface CreateAIInitiativeInput {
  tenantId: string;
  name: string;
  description?: string;
  initiativeType?: AIInitiativeType;
  status?: AIInitiativeStatus;
  ownerPrincipalId?: string;
  businessSponsorPrincipalId?: string;
  sourceSystem: string;
  sourceReference: string;
  metadata?: Record<string, unknown>;
}

export interface ResolvedEconomics {
  totalSpend: number;
  totalAttributedValue: number;
  verifiedValue: number;
  protectedValue: number;
  verdict: string;
  confidence: number;
}

export interface ResolvedAttribution { attributedValueAmount: number; attributionConfidence?: number }
export interface ResolvedWorkflowValue { aiAttributedValue: number }

export interface AIInitiativePortfolioResolvers {
  resolveEconomics?(tenantId: string, economicProfileId: string): Promise<ResolvedEconomics | undefined>;
  resolveAttribution?(tenantId: string, attributionId: string): Promise<ResolvedAttribution | undefined>;
  resolveWorkflowValue?(tenantId: string, workflowId: string): Promise<ResolvedWorkflowValue | undefined>;
}

const HIGH_CONFIDENCE = 0.7;
const LOW_CONFIDENCE = 0.4;

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export class AIInitiativePortfolioService {
  constructor(
    private readonly repo: AIInitiativePortfolioRepository = aiInitiativePortfolioRepository,
    private readonly resolvers: AIInitiativePortfolioResolvers = {},
  ) {}

  async createInitiative(input: CreateAIInitiativeInput): Promise<AIInitiative> {
    const now = new Date().toISOString();
    const initiative: AIInitiative = {
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      normalizedName: normalize(input.name),
      description: input.description,
      initiativeType: input.initiativeType ?? 'UNKNOWN',
      status: input.status ?? 'PROPOSED',
      ownerPrincipalId: input.ownerPrincipalId,
      businessSponsorPrincipalId: input.businessSponsorPrincipalId,
      sourceSystem: input.sourceSystem,
      sourceReference: input.sourceReference,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };
    return this.repo.upsertInitiative(initiative);
  }

  async linkInvestment(tenantId: string, initiativeId: string, investmentId: string, confidence?: number) {
    return this.repo.upsertInvestmentLink({ id: randomUUID(), tenantId, initiativeId, investmentId, confidence, createdAt: new Date().toISOString() });
  }
  async linkWorkflow(tenantId: string, initiativeId: string, workflowId: string, confidence?: number) {
    return this.repo.upsertWorkflowLink({ id: randomUUID(), tenantId, initiativeId, workflowId, confidence, createdAt: new Date().toISOString() });
  }
  async linkAttribution(tenantId: string, initiativeId: string, attributionId: string, confidence?: number) {
    return this.repo.upsertAttributionLink({ id: randomUUID(), tenantId, initiativeId, attributionId, confidence, createdAt: new Date().toISOString() });
  }
  async linkEconomics(tenantId: string, initiativeId: string, economicProfileId: string, confidence?: number) {
    return this.repo.upsertEconomicsLink({ id: randomUUID(), tenantId, initiativeId, economicProfileId, confidence, createdAt: new Date().toISOString() });
  }
  async linkOutcome(tenantId: string, initiativeId: string, outcomeId: string, confidence?: number) {
    return this.repo.upsertOutcomeLink({ id: randomUUID(), tenantId, initiativeId, outcomeId, confidence, createdAt: new Date().toISOString() });
  }

  private async requireInitiative(tenantId: string, initiativeId: string): Promise<AIInitiative> {
    const initiative = await this.repo.getInitiative(tenantId, initiativeId);
    if (!initiative) throw new Error(`ai initiative not found: ${initiativeId}`);
    return initiative;
  }

  async getInitiativeGraph(tenantId: string, initiativeId: string): Promise<InitiativePortfolioGraph> {
    const initiative = await this.requireInitiative(tenantId, initiativeId);
    const [investmentLinks, workflowLinks, attributionLinks, economicsLinks, outcomeLinks] = await Promise.all([
      this.repo.listInvestmentLinks(tenantId, { initiativeId }),
      this.repo.listWorkflowLinks(tenantId, { initiativeId }),
      this.repo.listAttributionLinks(tenantId, { initiativeId }),
      this.repo.listEconomicsLinks(tenantId, { initiativeId }),
      this.repo.listOutcomeLinks(tenantId, { initiativeId }),
    ]);
    return { initiative, investmentLinks, workflowLinks, attributionLinks, economicsLinks, outcomeLinks };
  }

  getInitiative(tenantId: string, id: string): Promise<AIInitiative | undefined> { return this.repo.getInitiative(tenantId, id); }

  async listInitiatives(tenantId: string, filters: Record<string, unknown> = {}): Promise<AIInitiative[]> {
    const { workflowId, investmentId, ...rest } = filters as { workflowId?: string; investmentId?: string };
    if (workflowId) {
      const links = await this.repo.listWorkflowLinks(tenantId, { workflowId });
      const initiatives = await Promise.all(links.map((l) => this.repo.getInitiative(tenantId, l.initiativeId)));
      return initiatives.filter((i): i is AIInitiative => Boolean(i));
    }
    if (investmentId) {
      const links = await this.repo.listInvestmentLinks(tenantId, { investmentId });
      const initiatives = await Promise.all(links.map((l) => this.repo.getInitiative(tenantId, l.initiativeId)));
      return initiatives.filter((i): i is AIInitiative => Boolean(i));
    }
    return this.repo.listInitiatives(tenantId, rest);
  }

  async evaluateInitiative(tenantId: string, initiativeId: string): Promise<InitiativePortfolioEvaluation> {
    const graph = await this.getInitiativeGraph(tenantId, initiativeId);

    const resolvedEconomics = (await Promise.all(graph.economicsLinks.map((l) => this.resolvers.resolveEconomics?.(tenantId, l.economicProfileId)))).filter((e): e is ResolvedEconomics => Boolean(e));
    const resolvedAttributions = (await Promise.all(graph.attributionLinks.map((l) => this.resolvers.resolveAttribution?.(tenantId, l.attributionId)))).filter((a): a is ResolvedAttribution => Boolean(a));
    const resolvedWorkflows = (await Promise.all(graph.workflowLinks.map((l) => this.resolvers.resolveWorkflowValue?.(tenantId, l.workflowId)))).filter((w): w is ResolvedWorkflowValue => Boolean(w));

    const totalSpend = resolvedEconomics.reduce((sum, e) => sum + e.totalSpend, 0);
    const economicsValue = resolvedEconomics.reduce((sum, e) => sum + e.totalAttributedValue, 0);
    const attributionValue = resolvedAttributions.reduce((sum, a) => sum + a.attributedValueAmount, 0);
    const workflowValue = resolvedWorkflows.reduce((sum, w) => sum + w.aiAttributedValue, 0);
    const attributedValue = resolvedEconomics.length > 0 ? economicsValue : (resolvedAttributions.length > 0 ? attributionValue : workflowValue);

    const verifiedValue = resolvedEconomics.reduce((sum, e) => sum + e.verifiedValue, 0);
    const protectedValue = resolvedEconomics.reduce((sum, e) => sum + e.protectedValue, 0);
    const valueToCostRatio = totalSpend > 0 ? Math.round((attributedValue / totalSpend) * 1000) / 1000 : 0;

    const economicVerdict = resolvedEconomics.length > 0
      ? (resolvedEconomics.find((e) => e.verdict === 'RETIRE')?.verdict
        ?? resolvedEconomics.find((e) => e.verdict === 'REVIEW')?.verdict
        ?? resolvedEconomics.find((e) => e.verdict === 'OPTIMISE')?.verdict
        ?? resolvedEconomics.find((e) => e.verdict === 'EXPAND')?.verdict
        ?? resolvedEconomics[0].verdict)
      : 'INSUFFICIENT_DATA';

    const confidenceInputs = [
      ...resolvedEconomics.map((e) => e.confidence),
      ...resolvedAttributions.map((a) => a.attributionConfidence).filter((c): c is number => c !== undefined),
      ...[...graph.investmentLinks, ...graph.workflowLinks, ...graph.attributionLinks, ...graph.economicsLinks, ...graph.outcomeLinks].map((l) => l.confidence).filter((c): c is number => c !== undefined),
    ];
    const confidence = confidenceInputs.length > 0
      ? Math.round((confidenceInputs.reduce((sum, c) => sum + c, 0) / confidenceInputs.length) * 1000) / 1000
      : 0.5;

    const hasHistory = graph.economicsLinks.length > 0 || graph.attributionLinks.length > 0 || graph.workflowLinks.length > 0;

    let portfolioVerdict: PortfolioVerdict;
    if (!hasHistory || (totalSpend <= 0 && attributedValue <= 0)) { portfolioVerdict = 'EXPERIMENT'; }
    else if (totalSpend > 0 && attributedValue <= 0) { portfolioVerdict = 'RETIRE'; }
    else if (confidence < LOW_CONFIDENCE) { portfolioVerdict = 'REVIEW'; }
    else if (valueToCostRatio >= 3 && protectedValue > 0 && confidence >= HIGH_CONFIDENCE && economicVerdict === 'EXPAND') { portfolioVerdict = 'SCALE'; }
    else if (valueToCostRatio < 1) { portfolioVerdict = 'OPTIMISE'; }
    else { portfolioVerdict = 'MAINTAIN'; }

    const existing = await this.repo.getEvaluation(tenantId, initiativeId);
    const now = new Date().toISOString();
    const evaluation: InitiativePortfolioEvaluation = {
      id: existing?.id ?? initiativeId,
      tenantId,
      initiativeId,
      attributedValue,
      verifiedValue,
      protectedValue,
      totalSpend,
      valueToCostRatio,
      economicVerdict,
      portfolioVerdict,
      confidence,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      metadata: existing?.metadata ?? {},
    };
    await this.repo.upsertEvaluation(evaluation);
    return evaluation;
  }

  async getInitiativeLineage(tenantId: string, initiativeId: string): Promise<InitiativeLineage> {
    const graph = await this.getInitiativeGraph(tenantId, initiativeId);
    const evaluation = await this.evaluateInitiative(tenantId, initiativeId);
    return { ...graph, evaluation };
  }

  async getPortfolioSummary(tenantId: string): Promise<PortfolioSummary> {
    const initiatives = await this.repo.listInitiatives(tenantId);
    const evaluations = await Promise.all(initiatives.map((i) => this.evaluateInitiative(tenantId, i.id)));
    const countBy = (verdict: PortfolioVerdict) => evaluations.filter((e) => e.portfolioVerdict === verdict).length;
    const portfolioValue = evaluations.reduce((sum, e) => sum + e.attributedValue, 0);
    const portfolioSpend = evaluations.reduce((sum, e) => sum + e.totalSpend, 0);
    return {
      initiativeCount: initiatives.length,
      scaleCandidates: countBy('SCALE'),
      maintainCandidates: countBy('MAINTAIN'),
      optimiseCandidates: countBy('OPTIMISE'),
      reviewCandidates: countBy('REVIEW'),
      retireCandidates: countBy('RETIRE'),
      experimentCandidates: countBy('EXPERIMENT'),
      portfolioValue,
      portfolioSpend,
      portfolioEfficiency: portfolioSpend > 0 ? Math.round((portfolioValue / portfolioSpend) * 1000) / 1000 : 0,
    };
  }

  async getTopInitiatives(tenantId: string, limit = 5): Promise<Array<AIInitiative & { evaluation: InitiativePortfolioEvaluation }>> {
    const initiatives = await this.repo.listInitiatives(tenantId);
    const withEvaluations = await Promise.all(initiatives.map(async (initiative) => ({ ...initiative, evaluation: await this.evaluateInitiative(tenantId, initiative.id) })));
    return withEvaluations.sort((a, b) => b.evaluation.attributedValue - a.evaluation.attributedValue).slice(0, limit);
  }
}

export const aiInitiativePortfolioService = new AIInitiativePortfolioService();
