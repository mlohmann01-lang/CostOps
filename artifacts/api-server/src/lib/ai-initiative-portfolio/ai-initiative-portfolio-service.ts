import { randomUUID } from 'node:crypto';
import { AIInitiativePortfolioRepository, aiInitiativePortfolioRepository } from './ai-initiative-portfolio-repository';
import type {
  AIInitiative, AIInitiativeLifecycle, AIInitiativeStatus, AIInitiativeType, ExecutivePortfolioView,
  InitiativeConfidenceLevel, InitiativeConfidenceResult, InitiativeLineage, InitiativeOutcomeSummary,
  InitiativeOwnershipEvaluation, InitiativePortfolioEvaluation, InitiativePortfolioGraph,
  InitiativeRecommendation, InitiativeValueSummary, LifecycleTransitionCheck, PortfolioSummary, PortfolioVerdict,
} from './ai-initiative-portfolio-types';
import { aiValueAttributionRepository } from '../ai-value-attribution/ai-value-attribution-repository';
import { aiValueAttributionService } from '../ai-value-attribution/ai-value-attribution-service';

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
  lifecycle?: AIInitiativeLifecycle;
  ownerName?: string;
  executiveSponsor?: string;
  department?: string;
  costCentre?: string;
  objectiveIds?: string[];
  assetIds?: string[];
  tags?: string[];
}

export interface UpdateAIInitiativeInput {
  name?: string;
  description?: string;
  initiativeType?: AIInitiativeType;
  status?: AIInitiativeStatus;
  ownerPrincipalId?: string;
  businessSponsorPrincipalId?: string;
  lifecycle?: AIInitiativeLifecycle;
  ownerName?: string;
  executiveSponsor?: string;
  department?: string;
  costCentre?: string;
  tags?: string[];
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
      lifecycle: input.lifecycle ?? 'PROPOSED',
      ownerName: input.ownerName,
      executiveSponsor: input.executiveSponsor,
      department: input.department,
      costCentre: input.costCentre,
      objectiveIds: input.objectiveIds ?? [],
      assetIds: input.assetIds ?? [],
      tags: input.tags ?? [],
    };
    return this.repo.upsertInitiative(initiative);
  }

  async updateInitiative(tenantId: string, initiativeId: string, patch: UpdateAIInitiativeInput): Promise<AIInitiative> {
    const existing = await this.requireInitiative(tenantId, initiativeId);
    if (patch.lifecycle && patch.lifecycle !== existing.lifecycle) {
      const check = await this.validateLifecycleTransition(tenantId, initiativeId, patch.lifecycle);
      if (!check.allowed) throw Object.assign(new Error(check.reason ?? 'LIFECYCLE_TRANSITION_NOT_ALLOWED'), { statusCode: 400 });
    }
    const updated: AIInitiative = {
      ...existing,
      ...patch,
      id: existing.id,
      tenantId,
      updatedAt: new Date().toISOString(),
      retiredAt: patch.lifecycle === 'RETIRED' ? new Date().toISOString() : existing.retiredAt,
    };
    return this.repo.upsertInitiative(updated);
  }

  async retireInitiative(tenantId: string, initiativeId: string): Promise<AIInitiative> {
    return this.updateInitiative(tenantId, initiativeId, { lifecycle: 'RETIRED' });
  }

  async linkAsset(tenantId: string, initiativeId: string, assetId: string) {
    const initiative = await this.requireInitiative(tenantId, initiativeId);
    const link = await this.repo.upsertAssetLink({ id: randomUUID(), tenantId, initiativeId, assetId, createdAt: new Date().toISOString() });
    if (!(initiative.assetIds ?? []).includes(assetId)) {
      await this.repo.upsertInitiative({ ...initiative, assetIds: [...(initiative.assetIds ?? []), assetId], updatedAt: new Date().toISOString() });
    }
    return link;
  }

  async linkObjective(tenantId: string, initiativeId: string, objectiveId: string) {
    const initiative = await this.requireInitiative(tenantId, initiativeId);
    const link = await this.repo.upsertObjectiveLink({ id: randomUUID(), tenantId, initiativeId, objectiveId, createdAt: new Date().toISOString() });
    if (!(initiative.objectiveIds ?? []).includes(objectiveId)) {
      await this.repo.upsertInitiative({ ...initiative, objectiveIds: [...(initiative.objectiveIds ?? []), objectiveId], updatedAt: new Date().toISOString() });
    }
    return link;
  }

  // Capability 2 — Initiative Ownership. Never invents missing ownership data.
  async evaluateOwnership(tenantId: string, initiativeId: string): Promise<InitiativeOwnershipEvaluation> {
    const initiative = await this.requireInitiative(tenantId, initiativeId);
    const hasOwner = Boolean(initiative.ownerPrincipalId || initiative.ownerName);
    const hasExecutiveSponsor = Boolean(initiative.businessSponsorPrincipalId || initiative.executiveSponsor);
    const hasDepartment = Boolean(initiative.department);
    const hasCostCentre = Boolean(initiative.costCentre);
    const missing: string[] = [];
    if (!hasOwner) missing.push('owner');
    if (!hasExecutiveSponsor) missing.push('executiveSponsor');
    if (!hasDepartment) missing.push('department');
    if (!hasCostCentre) missing.push('costCentre');
    return { initiativeId, hasOwner, hasExecutiveSponsor, hasDepartment, hasCostCentre, complete: missing.length === 0, missing };
  }

  // Capability 4 — Initiative Outcome Aggregation. Reuses AI1 attribution
  // outputs only; never fabricates outcome counts.
  async getInitiativeOutcomeSummary(tenantId: string, initiativeId: string): Promise<InitiativeOutcomeSummary> {
    const attributionLinks = await this.repo.listAttributionLinks(tenantId, { initiativeId });
    const attributions = (await Promise.all(attributionLinks.map((l) => aiValueAttributionRepository.getAttribution(tenantId, l.attributionId))))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    const evidenceByAttribution = await Promise.all(attributions.map((a) => aiValueAttributionRepository.listEvidence(tenantId, { attributionId: a.id })));
    const evidenceCount = evidenceByAttribution.flat().length;
    const lineages = await Promise.all(attributions.map((a) => aiValueAttributionService.getAttributionLineage(tenantId, a.id)));
    const completeLineageRatio = attributions.length ? lineages.filter((l) => l.complete).length / attributions.length : 0;
    const outcomeLinks = await this.repo.listOutcomeLinks(tenantId, { initiativeId });
    const assetLinks = await this.repo.listAssetLinks(tenantId, { initiativeId });
    return {
      initiativeId,
      attributionCount: attributions.length,
      outcomeCount: outcomeLinks.length,
      assetCount: assetLinks.length,
      evidenceCount,
      completeLineageRatio: Math.round(completeLineageRatio * 1000) / 1000,
    };
  }

  // Capability 6 — Initiative Confidence. Rolls up AI1 attribution confidence,
  // evidence quality and lineage/outcome stability into one of
  // LOW/MODERATE/HIGH/VERIFIED. Zero attributions is reported as LOW, not
  // fabricated as higher confidence.
  async getInitiativeConfidence(tenantId: string, initiativeId: string): Promise<InitiativeConfidenceResult> {
    const attributionLinks = await this.repo.listAttributionLinks(tenantId, { initiativeId });
    const attributions = (await Promise.all(attributionLinks.map((l) => aiValueAttributionRepository.getAttribution(tenantId, l.attributionId))))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));

    if (attributions.length === 0) {
      return {
        initiativeId, level: 'LOW', score: 0, attributionCount: 0, averageAttributionConfidence: 0,
        evidenceQualityRatio: 0, outcomeStabilityRatio: 0,
        reasoning: 'No linked attributions; confidence cannot be claimed without evidence.',
      };
    }

    const confidenceScores = attributions.map((a: any) => a.confidenceScore).filter((s: unknown): s is number => typeof s === 'number');
    const averageAttributionConfidence = confidenceScores.length ? confidenceScores.reduce((sum, s) => sum + s, 0) / confidenceScores.length : 0;

    const evidenceByAttribution = await Promise.all(attributions.map((a) => aiValueAttributionRepository.listEvidence(tenantId, { attributionId: a.id })));
    const allEvidence = evidenceByAttribution.flat();
    const strongEvidence = allEvidence.filter((e: any) => e.evidenceStrength === 'VERIFIED' || e.evidenceStrength === 'OBSERVED').length;
    const evidenceQualityRatio = allEvidence.length ? strongEvidence / allEvidence.length : 0;

    const lineages = await Promise.all(attributions.map((a) => aiValueAttributionService.getAttributionLineage(tenantId, a.id)));
    const outcomeStabilityRatio = attributions.length ? lineages.filter((l) => l.complete).length / attributions.length : 0;

    const score = Math.round((Math.min(1, averageAttributionConfidence / 100) * 40) + (evidenceQualityRatio * 30) + (outcomeStabilityRatio * 30));

    let level: InitiativeConfidenceLevel;
    if (score >= 85) level = 'VERIFIED';
    else if (score >= 65) level = 'HIGH';
    else if (score >= 35) level = 'MODERATE';
    else level = 'LOW';

    return {
      initiativeId, level, score, attributionCount: attributions.length,
      averageAttributionConfidence: Math.round(averageAttributionConfidence * 100) / 100,
      evidenceQualityRatio: Math.round(evidenceQualityRatio * 1000) / 1000,
      outcomeStabilityRatio: Math.round(outcomeStabilityRatio * 1000) / 1000,
      reasoning: `${level} (${score}/100): average attribution confidence ${Math.round(averageAttributionConfidence)}, `
        + `${strongEvidence}/${allEvidence.length || 0} evidence items VERIFIED/OBSERVED, `
        + `${Math.round(outcomeStabilityRatio * 100)}% of attributions have complete lineage.`,
    };
  }

  // Capability 5 — Initiative Value Aggregation. Reuses asset names and
  // outcome/confidence rollups; never fabricates a monetary estimate.
  async getInitiativeValueSummary(tenantId: string, initiativeId: string, assetNameResolver?: (assetId: string) => Promise<string | undefined>): Promise<InitiativeValueSummary> {
    const initiative = await this.requireInitiative(tenantId, initiativeId);
    const outcomeSummary = await this.getInitiativeOutcomeSummary(tenantId, initiativeId);
    const confidence = await this.getInitiativeConfidence(tenantId, initiativeId);
    const assetLinks = await this.repo.listAssetLinks(tenantId, { initiativeId });
    const assetNames = assetNameResolver
      ? (await Promise.all(assetLinks.map((l) => assetNameResolver(l.assetId)))).filter((n): n is string => Boolean(n))
      : assetLinks.map((l) => l.assetId);
    const evaluation = await this.repo.getEvaluation(tenantId, initiativeId);
    const valueEstimate: number | 'UNKNOWN' = evaluation && (evaluation.attributedValue > 0 || evaluation.totalSpend > 0) ? evaluation.attributedValue : 'UNKNOWN';
    return {
      initiativeId,
      name: initiative.name,
      assetNames,
      outcomeCount: outcomeSummary.outcomeCount,
      confidenceLevel: confidence.level,
      valueSignalCount: outcomeSummary.evidenceCount,
      valueEstimate,
    };
  }

  // Capability 7 — Initiative Lifecycle Governance.
  async validateLifecycleTransition(tenantId: string, initiativeId: string, target: AIInitiativeLifecycle): Promise<LifecycleTransitionCheck> {
    const initiative = await this.requireInitiative(tenantId, initiativeId);
    const ownership = await this.evaluateOwnership(tenantId, initiativeId);
    const outcomeSummary = await this.getInitiativeOutcomeSummary(tenantId, initiativeId);

    if (target === 'OPERATIONAL' && !ownership.hasOwner) {
      return { allowed: false, reason: 'No owner — cannot become OPERATIONAL.' };
    }
    if (target === 'SCALING' && outcomeSummary.outcomeCount === 0) {
      return { allowed: false, reason: 'No outcomes — cannot become SCALING.' };
    }
    if ((target === 'PILOT' || target === 'SCALING' || target === 'OPERATIONAL') && !ownership.hasOwner) {
      return { allowed: false, reason: `No owner — cannot become ${target}.` };
    }
    if (target === 'APPROVED' && initiative.lifecycle === 'RETIRED') {
      return { allowed: false, reason: 'Retired initiatives cannot be re-approved.' };
    }
    return { allowed: true };
  }

  // Capability 8 — Initiative Recommendation Engine. Spend is intentionally
  // excluded — AI Economics owns spend-based recommendations.
  async recommendAction(tenantId: string, initiativeId: string): Promise<InitiativeRecommendation> {
    const initiative = await this.requireInitiative(tenantId, initiativeId);
    const ownership = await this.evaluateOwnership(tenantId, initiativeId);
    const outcomeSummary = await this.getInitiativeOutcomeSummary(tenantId, initiativeId);
    const confidence = await this.getInitiativeConfidence(tenantId, initiativeId);

    if (initiative.lifecycle === 'RETIRED') {
      return { initiativeId, action: 'RETIRE', reasoning: 'Initiative is already retired.' };
    }
    if (!ownership.hasOwner) {
      return { initiativeId, action: 'REVIEW', reasoning: 'No accountable owner; ownership must be assigned before further investment decisions.' };
    }
    if (outcomeSummary.outcomeCount === 0 && outcomeSummary.attributionCount === 0) {
      return { initiativeId, action: 'REVIEW', reasoning: 'No outcomes or attributions exist yet; insufficient evidence to recommend expansion or retirement.' };
    }
    if (confidence.level === 'LOW') {
      return { initiativeId, action: 'REVIEW', reasoning: 'Confidence is LOW; evidence quality or lineage completeness is insufficient to act on.' };
    }
    if (outcomeSummary.outcomeCount === 0) {
      return { initiativeId, action: 'OPTIMISE', reasoning: 'Attributions exist but no realised outcomes; optimise before scaling further.' };
    }
    if ((confidence.level === 'HIGH' || confidence.level === 'VERIFIED') && outcomeSummary.outcomeCount > 0 && outcomeSummary.evidenceCount > 0) {
      return { initiativeId, action: 'EXPAND', reasoning: `Confidence is ${confidence.level} with ${outcomeSummary.outcomeCount} outcome(s) and ${outcomeSummary.evidenceCount} evidence item(s); expansion is supported.` };
    }
    return { initiativeId, action: 'KEEP', reasoning: `Confidence is ${confidence.level} with ${outcomeSummary.outcomeCount} outcome(s); continue at current scope.` };
  }

  // Capability 10 — Executive Portfolio View.
  async getExecutivePortfolioView(tenantId: string): Promise<ExecutivePortfolioView> {
    const initiatives = await this.repo.listInitiatives(tenantId);
    const outcomeSummaries = await Promise.all(initiatives.map((i) => this.getInitiativeOutcomeSummary(tenantId, i.id)));
    return {
      tenantId,
      totalInitiatives: initiatives.length,
      activeInitiatives: initiatives.filter((i) => i.lifecycle && i.lifecycle !== 'PROPOSED' && i.lifecycle !== 'RETIRED').length,
      scalingInitiatives: initiatives.filter((i) => i.lifecycle === 'SCALING').length,
      initiativesWithOutcomes: outcomeSummaries.filter((s) => s.outcomeCount > 0).length,
      initiativesWithEvidenceBackedValue: outcomeSummaries.filter((s) => s.evidenceCount > 0).length,
      retiredInitiatives: initiatives.filter((i) => i.lifecycle === 'RETIRED').length,
    };
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
