import { randomUUID } from 'node:crypto';
import { ValueRealisationRepository, valueRealisationRepository } from './value-realisation-repository';
import type {
  BusinessCapability, CapabilityType, Investment, InvestmentAsset, InvestmentAssetRelationshipType,
  InvestmentCapability, InvestmentCapabilityRelationshipType, InvestmentDecision, InvestmentLineage,
  InvestmentStatus, InvestmentType, InvestmentValueEvaluation, ValueAttribution, ValueAttributionMethod,
  ValueAttributionType, ValueSignal, ValueSignalDirection, ValueSignalType,
} from './value-realisation-types';

export interface CreateInvestmentInput {
  tenantId: string;
  name: string;
  description?: string;
  investmentType: InvestmentType;
  status?: InvestmentStatus;
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
  metadata?: Record<string, unknown>;
}

export interface CreateOrUpdateBusinessCapabilityInput {
  tenantId: string;
  id?: string;
  name: string;
  description?: string;
  capabilityType: CapabilityType;
  ownerPrincipalId?: string;
  parentCapabilityId?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateValueSignalInput {
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
  metadata?: Record<string, unknown>;
}

export interface CreateValueAttributionInput {
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
  metadata?: Record<string, unknown>;
}

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-');

export class ValueRealisationAuthorityService {
  constructor(readonly repo: ValueRealisationRepository = valueRealisationRepository) {}

  async createInvestment(input: CreateInvestmentInput): Promise<Investment> {
    const now = new Date().toISOString();
    const investment: Investment = {
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      normalizedName: normalize(input.name),
      description: input.description,
      investmentType: input.investmentType,
      status: input.status ?? 'PROPOSED',
      sourceSystem: input.sourceSystem,
      sourceReference: input.sourceReference,
      ownerPrincipalId: input.ownerPrincipalId,
      sponsorPrincipalId: input.sponsorPrincipalId,
      startDate: input.startDate,
      endDate: input.endDate,
      expectedValueAmount: input.expectedValueAmount,
      expectedValueCurrency: input.expectedValueCurrency,
      actualSpendAmount: input.actualSpendAmount,
      actualSpendCurrency: input.actualSpendCurrency,
      valueHypothesis: input.valueHypothesis,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };
    return this.repo.upsertInvestment(investment);
  }

  async createOrUpdateBusinessCapability(input: CreateOrUpdateBusinessCapabilityInput): Promise<BusinessCapability> {
    const now = new Date().toISOString();
    const existing = input.id ? await this.repo.getCapability(input.tenantId, input.id) : undefined;
    const capability: BusinessCapability = {
      id: existing?.id ?? input.id ?? randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      normalizedName: normalize(input.name),
      description: input.description ?? existing?.description,
      capabilityType: input.capabilityType,
      ownerPrincipalId: input.ownerPrincipalId ?? existing?.ownerPrincipalId,
      parentCapabilityId: input.parentCapabilityId ?? existing?.parentCapabilityId,
      status: input.status ?? existing?.status ?? 'ACTIVE',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
    };
    return this.repo.upsertCapability(capability);
  }

  async linkInvestmentToCapability(tenantId: string, investmentId: string, capabilityId: string, relationshipType: InvestmentCapabilityRelationshipType, opts: { confidence?: number; sourceSystem?: string; metadata?: Record<string, unknown> } = {}): Promise<InvestmentCapability> {
    const link: InvestmentCapability = {
      id: randomUUID(), tenantId, investmentId, capabilityId, relationshipType,
      confidence: opts.confidence, sourceSystem: opts.sourceSystem, metadata: opts.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    return this.repo.upsertInvestmentCapability(link);
  }

  async linkInvestmentToAsset(tenantId: string, investmentId: string, assetId: string, relationshipType: InvestmentAssetRelationshipType, opts: { confidence?: number; sourceSystem?: string; metadata?: Record<string, unknown> } = {}): Promise<InvestmentAsset> {
    const link: InvestmentAsset = {
      id: randomUUID(), tenantId, investmentId, assetId, relationshipType,
      confidence: opts.confidence, sourceSystem: opts.sourceSystem, metadata: opts.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    return this.repo.upsertInvestmentAsset(link);
  }

  async attachDecisionToInvestment(tenantId: string, investmentId: string, decisionId: string, metadata: Record<string, unknown> = {}): Promise<InvestmentDecision> {
    const existing = await this.repo.listInvestmentDecisions(tenantId, { investmentId, decisionId });
    if (existing[0]) return existing[0];
    const link: InvestmentDecision = { id: randomUUID(), tenantId, investmentId, decisionId, metadata, createdAt: new Date().toISOString() };
    return this.repo.upsertInvestmentDecision(link);
  }

  getDecisionsForInvestment(tenantId: string, investmentId: string): Promise<InvestmentDecision[]> {
    return this.repo.listInvestmentDecisions(tenantId, { investmentId });
  }

  async createValueSignal(input: CreateValueSignalInput): Promise<ValueSignal> {
    const now = new Date().toISOString();
    const signal: ValueSignal = {
      id: randomUUID(),
      tenantId: input.tenantId,
      investmentId: input.investmentId,
      capabilityId: input.capabilityId,
      assetId: input.assetId,
      signalType: input.signalType,
      signalName: input.signalName,
      signalDirection: input.signalDirection,
      measurementUnit: input.measurementUnit,
      baselineValue: input.baselineValue,
      currentValue: input.currentValue,
      targetValue: input.targetValue,
      verifiedValue: input.verifiedValue,
      confidence: input.confidence,
      evidenceItemId: input.evidenceItemId,
      collectedAt: input.collectedAt ?? now,
      sourceSystem: input.sourceSystem,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    return this.repo.upsertSignal(signal);
  }

  async updateValueSignal(tenantId: string, signalId: string, patch: Partial<ValueSignal>): Promise<ValueSignal> {
    const existing = await this.repo.getSignal(tenantId, signalId);
    if (!existing) throw new Error(`value signal not found: ${signalId}`);
    const updated: ValueSignal = { ...existing, ...patch, id: existing.id, tenantId, updatedAt: new Date().toISOString() };
    return this.repo.upsertSignal(updated);
  }

  async createValueAttribution(input: CreateValueAttributionInput): Promise<ValueAttribution> {
    const attribution: ValueAttribution = {
      id: randomUUID(),
      tenantId: input.tenantId,
      investmentId: input.investmentId,
      outcomeId: input.outcomeId,
      decisionId: input.decisionId,
      evidenceItemId: input.evidenceItemId,
      attributionType: input.attributionType,
      attributedValueAmount: input.attributedValueAmount,
      attributedValueCurrency: input.attributedValueCurrency,
      attributionConfidence: input.attributionConfidence,
      attributionMethod: input.attributionMethod,
      attributionSummary: input.attributionSummary,
      createdAt: new Date().toISOString(),
      metadata: input.metadata ?? {},
    };
    return this.repo.upsertAttribution(attribution);
  }

  getInvestmentById(tenantId: string, investmentId: string): Promise<Investment | undefined> {
    return this.repo.getInvestment(tenantId, investmentId);
  }

  listInvestments(tenantId: string, filters: Record<string, unknown> = {}): Promise<Investment[]> {
    return this.repo.listInvestments(tenantId, filters);
  }

  private async requireInvestment(tenantId: string, investmentId: string): Promise<Investment> {
    const investment = await this.repo.getInvestment(tenantId, investmentId);
    if (!investment) throw new Error(`investment not found: ${investmentId}`);
    return investment;
  }

  /** Deterministic, no-LLM evaluation of an investment's realised value against its expected value. */
  async evaluateInvestmentValue(tenantId: string, investmentId: string): Promise<InvestmentValueEvaluation> {
    const investment = await this.requireInvestment(tenantId, investmentId);
    const attributions = await this.repo.listAttributions(tenantId, { investmentId });
    const signals = await this.repo.listSignals(tenantId, { investmentId });
    const decisions = await this.repo.listInvestmentDecisions(tenantId, { investmentId });

    const sumBy = (type: ValueAttributionType) => attributions.filter((a) => a.attributionType === type).reduce((sum, a) => sum + a.attributedValueAmount, 0);
    const totalProjectedValue = sumBy('PROJECTED');
    const totalExecutedValue = sumBy('EXECUTED');
    const totalVerifiedValue = sumBy('VERIFIED');
    const totalProtectedValue = sumBy('PROTECTED');

    const evidenceCount = new Set([
      ...attributions.map((a) => a.evidenceItemId).filter(Boolean),
      ...signals.map((s) => s.evidenceItemId).filter(Boolean),
    ]).size;
    const decisionCount = decisions.length;
    const outcomeIds = new Set(attributions.map((a) => a.outcomeId).filter(Boolean) as string[]);
    const outcomeCount = outcomeIds.size;
    const protectedOutcomeIds = new Set(attributions.filter((a) => a.attributionType === 'PROTECTED').map((a) => a.outcomeId).filter(Boolean) as string[]);
    const protectedOutcomeCount = protectedOutcomeIds.size;

    const expectedValue = investment.expectedValueAmount ?? 0;
    const valueRealisationRatio = expectedValue > 0 ? totalVerifiedValue / expectedValue : (totalVerifiedValue > 0 ? 1 : 0);

    let verdict: InvestmentValueEvaluation['verdict'];
    if (evidenceCount === 0 && outcomeCount === 0) {
      verdict = 'INSUFFICIENT_EVIDENCE';
    } else if (expectedValue > 0 && totalVerifiedValue >= expectedValue) {
      verdict = 'VALUE_CONFIRMED';
    } else if (totalVerifiedValue > 0 && (expectedValue === 0 || totalVerifiedValue < expectedValue)) {
      verdict = 'PARTIAL_VALUE_CONFIRMED';
    } else if (outcomeCount > 0 && totalVerifiedValue === 0) {
      verdict = 'VALUE_NOT_CONFIRMED';
    } else {
      verdict = 'NEEDS_REVIEW';
    }

    let confidence = 0.5;
    if (verdict === 'INSUFFICIENT_EVIDENCE') confidence = 0.1;
    else if (verdict === 'VALUE_CONFIRMED') confidence = 0.85;
    else if (verdict === 'PARTIAL_VALUE_CONFIRMED') confidence = 0.6;
    else if (verdict === 'VALUE_NOT_CONFIRMED') confidence = 0.4;

    if (totalProtectedValue > 0) confidence = Math.min(1, confidence + 0.1);

    const lowConfidenceAttributions = attributions.filter((a) => a.attributionConfidence !== undefined && a.attributionConfidence < 0.5);
    if (lowConfidenceAttributions.length > 0) confidence = Math.max(0, confidence - 0.15);

    return {
      investmentId,
      totalProjectedValue,
      totalExecutedValue,
      totalVerifiedValue,
      totalProtectedValue,
      evidenceCount,
      decisionCount,
      outcomeCount,
      protectedOutcomeCount,
      valueRealisationRatio: Math.round(valueRealisationRatio * 1000) / 1000,
      confidence: Math.round(confidence * 1000) / 1000,
      verdict,
    };
  }

  async getInvestmentValueSummary(tenantId: string, investmentId: string) {
    const investment = await this.requireInvestment(tenantId, investmentId);
    const evaluation = await this.evaluateInvestmentValue(tenantId, investmentId);
    return { investment, evaluation };
  }

  async getInvestmentLineage(tenantId: string, investmentId: string): Promise<InvestmentLineage> {
    const investment = await this.requireInvestment(tenantId, investmentId);
    const [capabilities, assets, decisions, signals, attributions, evaluation] = await Promise.all([
      this.repo.listInvestmentCapabilities(tenantId, { investmentId }),
      this.repo.listInvestmentAssets(tenantId, { investmentId }),
      this.repo.listInvestmentDecisions(tenantId, { investmentId }),
      this.repo.listSignals(tenantId, { investmentId }),
      this.repo.listAttributions(tenantId, { investmentId }),
      this.evaluateInvestmentValue(tenantId, investmentId),
    ]);
    return { investment, capabilities, assets, decisions, signals, attributions, evaluation };
  }

  async generateValueRealisationSummary(tenantId: string) {
    const investments = await this.repo.listInvestments(tenantId);
    const evaluations = await Promise.all(investments.map((i) => this.evaluateInvestmentValue(tenantId, i.id)));
    const verdictCounts = evaluations.reduce<Record<string, number>>((acc, e) => { acc[e.verdict] = (acc[e.verdict] ?? 0) + 1; return acc; }, {});
    return {
      tenantId,
      investmentCount: investments.length,
      totalProjectedValue: evaluations.reduce((s, e) => s + e.totalProjectedValue, 0),
      totalVerifiedValue: evaluations.reduce((s, e) => s + e.totalVerifiedValue, 0),
      totalProtectedValue: evaluations.reduce((s, e) => s + e.totalProtectedValue, 0),
      verdictCounts,
      investments: investments.map((investment, idx) => ({ investment, evaluation: evaluations[idx] })),
    };
  }

  /**
   * Attribute an existing outcome ledger entry to an investment without creating new outcome
   * logic. Priority: (1) direct investmentId in outcome metadata, (2) linked asset,
   * (3) linked decision, (4) linked business capability, (5) caller-supplied manual input.
   * Returns undefined (does not force attribution) when confidence is weak.
   */
  async attributeOutcomeToInvestment(tenantId: string, outcome: { id: string; metadata?: Record<string, unknown>; targetEntityId?: string; recommendationId?: string; decisionId?: string; verifiedMonthlySavings?: number; annualisedSaving?: number }, opts: { manualInvestmentId?: string; manualConfidence?: number; minConfidence?: number } = {}): Promise<ValueAttribution | undefined> {
    const minConfidence = opts.minConfidence ?? 0.5;
    let investmentId: string | undefined;
    let attributionMethod: ValueAttributionMethod = 'SYSTEM_INFERRED';
    let confidence = 0.6;

    const metaInvestmentId = outcome.metadata?.investmentId as string | undefined;
    if (metaInvestmentId) {
      investmentId = metaInvestmentId;
      attributionMethod = 'OUTCOME_LEDGER';
      confidence = 0.95;
    } else if (outcome.targetEntityId) {
      const assetLinks = await this.repo.listInvestmentAssets(tenantId, { assetId: outcome.targetEntityId });
      if (assetLinks[0]) { investmentId = assetLinks[0].investmentId; confidence = 0.8; }
    }
    if (!investmentId && outcome.decisionId) {
      const decisionLinks = await this.repo.listInvestmentDecisions(tenantId, { decisionId: outcome.decisionId });
      if (decisionLinks[0]) { investmentId = decisionLinks[0].investmentId; confidence = 0.75; }
    }
    if (!investmentId && opts.manualInvestmentId) {
      investmentId = opts.manualInvestmentId;
      attributionMethod = 'MANUAL';
      confidence = opts.manualConfidence ?? 0.7;
    }
    if (!investmentId || confidence < minConfidence) return undefined;

    const verifiedValue = outcome.verifiedMonthlySavings !== undefined ? outcome.verifiedMonthlySavings * 12 : (outcome.annualisedSaving ?? 0);
    return this.createValueAttribution({
      tenantId,
      investmentId,
      outcomeId: outcome.id,
      decisionId: outcome.decisionId,
      attributionType: 'VERIFIED',
      attributedValueAmount: verifiedValue,
      attributionConfidence: confidence,
      attributionMethod,
      attributionSummary: `Attributed via ${attributionMethod.toLowerCase()} link`,
    });
  }
}

export const valueRealisationAuthorityService = new ValueRealisationAuthorityService();
