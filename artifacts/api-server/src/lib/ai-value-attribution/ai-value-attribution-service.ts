import { randomUUID } from 'node:crypto';
import { AIValueAttributionRepository, aiValueAttributionRepository } from './ai-value-attribution-repository';
import { computeAttributionConfidence } from './attribution-confidence-engine';
import { recommendAttributionAction } from './attribution-decision-engine';
import { economicOutcomeAttributionService } from '../economic-outcomes/economic-outcome-attribution';
import type {
  AIActivity, AIActivityGraph, AIActivityLineage, AIActivityType,
  AIAttributionMethod, AIAttributionType, AIValueAttribution, AIValueAttributionEvaluation,
  AIValueAttributionVerdict, AIValueSummary,
  AttributionContributor, AttributionContributorType, AttributionEvidenceRecord, AttributionEvidenceStrength,
  AttributionEvidenceType, AttributionLineage, AttributionRecommendation,
} from './ai-value-attribution-types';

export interface CreateAIActivityInput {
  tenantId: string;
  workflowId?: string;
  activityType: AIActivityType;
  activityName: string;
  provider?: string;
  model?: string;
  agent?: string;
  sourceSystem: string;
  sourceReference: string;
  usageCount?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateAIAttributionInput {
  tenantId: string;
  activityId: string;
  workflowId?: string;
  investmentId?: string;
  assetId?: string;
  valueSignalId?: string;
  decisionId?: string;
  outcomeId?: string;
  attributionType: AIAttributionType;
  attributionMethod: AIAttributionMethod;
  attributedValueAmount: number;
  attributedValueCurrency?: string;
  attributionConfidence?: number;
  evidenceItemId?: string;
  sourceSystem: string;
  sourceReference: string;
  metadata?: Record<string, unknown>;
}

/** Minimal shapes resolved by other authorities; kept loose so this service has no hard dependency on their packages. */
export interface ResolvedAIAsset { id: string; vendor?: string; type?: string }

export interface AIValueAttributionResolvers {
  resolveAIAsset?(tenantId: string, assetId: string): Promise<ResolvedAIAsset | undefined>;
  /** Workstream 7: additive hook so Value Realisation Authority's Verified/Protected Value can absorb AI attributions without this module owning that calculation. */
  recordInvestmentValueAttribution?(tenantId: string, attribution: AIValueAttribution): Promise<void>;
  /**
   * Program AI1 — "which executive objective benefited" must never be fabricated. The only
   * honest resolution path is matching the attribution's assetId against a BusinessObjective's
   * linkedAssetIds. Defaults to economic-outcomes' real service; overridable for tests/isolation.
   */
  listBusinessObjectivesForAsset?(tenantId: string, assetId: string): Promise<string[]>;
}

export interface SetContributorsInput {
  contributorType: AttributionContributorType;
  contributorId: string;
  label?: string;
  weight: number;
}

export interface AddEvidenceInput {
  evidenceType: AttributionEvidenceType;
  evidenceStrength: AttributionEvidenceStrength;
  source: string;
  timestamp: string;
  confidenceContribution?: number;
  description?: string;
}

export class AIValueAttributionService {
  constructor(
    private readonly repo: AIValueAttributionRepository = aiValueAttributionRepository,
    private readonly resolvers: AIValueAttributionResolvers = {
      listBusinessObjectivesForAsset: async (tenantId, assetId) => {
        const objectives = await economicOutcomeAttributionService.listBusinessObjectives(tenantId);
        return objectives.filter((o) => o.linkedAssetIds.includes(assetId)).map((o) => o.id);
      },
    },
  ) {}

  async createAIActivity(input: CreateAIActivityInput): Promise<AIActivity> {
    const now = new Date().toISOString();
    const activity: AIActivity = {
      id: randomUUID(),
      tenantId: input.tenantId,
      workflowId: input.workflowId,
      activityType: input.activityType,
      activityName: input.activityName,
      provider: input.provider,
      model: input.model,
      agent: input.agent,
      sourceSystem: input.sourceSystem,
      sourceReference: input.sourceReference,
      usageCount: input.usageCount,
      estimatedTokens: input.estimatedTokens,
      estimatedCost: input.estimatedCost,
      confidence: input.confidence,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };
    return this.repo.upsertActivity(activity);
  }

  async createAttribution(input: CreateAIAttributionInput): Promise<AIValueAttribution> {
    const now = new Date().toISOString();
    const attribution: AIValueAttribution = {
      id: randomUUID(),
      tenantId: input.tenantId,
      activityId: input.activityId,
      workflowId: input.workflowId,
      investmentId: input.investmentId,
      assetId: input.assetId,
      valueSignalId: input.valueSignalId,
      decisionId: input.decisionId,
      outcomeId: input.outcomeId,
      attributionType: input.attributionType,
      attributionMethod: input.attributionMethod,
      attributedValueAmount: input.attributedValueAmount,
      attributedValueCurrency: input.attributedValueCurrency,
      attributionConfidence: input.attributionConfidence,
      evidenceItemId: input.evidenceItemId,
      sourceSystem: input.sourceSystem,
      sourceReference: input.sourceReference,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };
    const saved = await this.repo.upsertAttribution(attribution);
    if (saved.investmentId) await this.resolvers.recordInvestmentValueAttribution?.(input.tenantId, saved);
    return saved;
  }

  async linkActivityToWorkflow(tenantId: string, activityId: string, workflowId: string, confidence?: number) {
    return this.repo.upsertWorkflowLink({ id: randomUUID(), tenantId, activityId, workflowId, confidence, createdAt: new Date().toISOString() });
  }

  async linkActivityToOutcome(tenantId: string, activityId: string, outcomeId: string, confidence?: number) {
    return this.repo.upsertOutcomeLink({ id: randomUUID(), tenantId, activityId, outcomeId, confidence, createdAt: new Date().toISOString() });
  }

  async linkActivityToDecision(tenantId: string, activityId: string, decisionId: string, confidence?: number) {
    return this.repo.upsertDecisionLink({ id: randomUUID(), tenantId, activityId, decisionId, confidence, createdAt: new Date().toISOString() });
  }

  async linkActivityToValueSignal(tenantId: string, activityId: string, valueSignalId: string, confidence?: number) {
    return this.repo.upsertValueSignalLink({ id: randomUUID(), tenantId, activityId, valueSignalId, confidence, createdAt: new Date().toISOString() });
  }

  getActivityById(tenantId: string, activityId: string): Promise<AIActivity | undefined> {
    return this.repo.getActivity(tenantId, activityId);
  }

  listActivities(tenantId: string, filters: Record<string, unknown> = {}): Promise<AIActivity[]> {
    return this.repo.listActivities(tenantId, filters);
  }

  getAttributionById(tenantId: string, attributionId: string): Promise<AIValueAttribution | undefined> {
    return this.repo.getAttribution(tenantId, attributionId);
  }

  listAttributions(tenantId: string, filters: Record<string, unknown> = {}): Promise<AIValueAttribution[]> {
    return this.repo.listAttributions(tenantId, filters);
  }

  private async requireActivity(tenantId: string, activityId: string): Promise<AIActivity> {
    const activity = await this.repo.getActivity(tenantId, activityId);
    if (!activity) throw new Error(`ai activity not found: ${activityId}`);
    return activity;
  }

  async getActivityGraph(tenantId: string, activityId: string): Promise<AIActivityGraph> {
    const activity = await this.requireActivity(tenantId, activityId);
    const [attributions, valueSignals, outcomes, decisions, workflows] = await Promise.all([
      this.repo.listAttributions(tenantId, { activityId }),
      this.repo.listValueSignalLinks(tenantId, { activityId }),
      this.repo.listOutcomeLinks(tenantId, { activityId }),
      this.repo.listDecisionLinks(tenantId, { activityId }),
      this.repo.listWorkflowLinks(tenantId, { activityId }),
    ]);
    return { activity, attributions, valueSignals, outcomes, decisions, workflows };
  }

  /** Workstream 6: lets Workflow Value Graph surface AI-attributed value without owning AI linkage itself. */
  async getWorkflowAIValue(tenantId: string, workflowId: string): Promise<{ activityCount: number; aiAttributedValue: number; attributions: AIValueAttribution[] }> {
    const links = await this.repo.listWorkflowLinks(tenantId, { workflowId });
    const directAttributions = await this.repo.listAttributions(tenantId, { workflowId });
    const linkedAttributions = (await Promise.all(links.map((l) => this.repo.listAttributions(tenantId, { activityId: l.activityId })))).flat();
    const attributions = [...directAttributions, ...linkedAttributions].filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);
    return {
      activityCount: links.length,
      aiAttributedValue: attributions.reduce((sum, a) => sum + a.attributedValueAmount, 0),
      attributions,
    };
  }

  /** Workstream 7: lets Value Realisation Authority surface AI-attributed value for an investment's attribution path. */
  async getInvestmentAIValue(tenantId: string, investmentId: string): Promise<{ attributionCount: number; aiAttributedValue: number; attributions: AIValueAttribution[] }> {
    const attributions = await this.repo.listAttributions(tenantId, { investmentId });
    return {
      attributionCount: attributions.length,
      aiAttributedValue: attributions.reduce((sum, a) => sum + a.attributedValueAmount, 0),
      attributions,
    };
  }

  /** Workstream 10: lets Decision Authority surface "AI contribution" on decision lineage without owning AI linkage itself. */
  async getAIActivitiesForDecision(tenantId: string, decisionId: string): Promise<AIActivity[]> {
    const links = await this.repo.listDecisionLinks(tenantId, { decisionId });
    const activities = await Promise.all(links.map((link) => this.repo.getActivity(tenantId, link.activityId)));
    return activities.filter((a): a is AIActivity => Boolean(a));
  }

  /** Deterministic, no-LLM evaluation. No hallucination: verdict is derived purely from the presence and value of linked evidence. */
  async evaluateAIValueAttribution(tenantId: string, activityId: string): Promise<AIValueAttributionEvaluation> {
    const graph = await this.getActivityGraph(tenantId, activityId);

    const sumByMethod = (method: AIAttributionMethod) => graph.attributions.filter((a) => a.attributionMethod === method).reduce((sum, a) => sum + a.attributedValueAmount, 0);
    const directEvidenceValue = sumByMethod('DIRECT_EVIDENCE');
    const workflowEvidenceValue = sumByMethod('WORKFLOW_EVIDENCE');
    const outcomeEvidenceValue = sumByMethod('OUTCOME_EVIDENCE');
    const totalAttributedValue = graph.attributions.reduce((sum, a) => sum + a.attributedValueAmount, 0);

    const hasFullChain = graph.workflows.length > 0 && graph.valueSignals.length > 0 && graph.outcomes.length > 0;
    const hasPartialChain = graph.workflows.length > 0 || graph.valueSignals.length > 0 || graph.outcomes.length > 0 || directEvidenceValue > 0;

    let verdict: AIValueAttributionVerdict;
    if (graph.attributions.length === 0) {
      verdict = 'INSUFFICIENT_EVIDENCE';
    } else if (totalAttributedValue <= 0) {
      verdict = 'UNATTRIBUTED';
    } else if (hasFullChain) {
      verdict = 'ATTRIBUTED';
    } else if (hasPartialChain) {
      verdict = 'PARTIALLY_ATTRIBUTED';
    } else {
      verdict = 'INSUFFICIENT_EVIDENCE';
    }

    let confidence = 0.5;
    if (verdict === 'ATTRIBUTED') confidence = 0.85;
    else if (verdict === 'PARTIALLY_ATTRIBUTED') confidence = 0.6;
    else if (verdict === 'UNATTRIBUTED') confidence = 0.2;
    else confidence = 0.1;

    const confidenceValues = graph.attributions.map((a) => a.attributionConfidence).filter((c): c is number => c !== undefined);
    if (confidenceValues.length > 0) {
      const avg = confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length;
      if (avg < 0.5) confidence = Math.max(0, confidence - 0.15);
      else if (avg >= 0.8) confidence = Math.min(1, confidence + 0.05);
    }

    return {
      activityId,
      totalAttributedValue,
      directEvidenceValue,
      workflowEvidenceValue,
      outcomeEvidenceValue,
      confidence: Math.round(confidence * 1000) / 1000,
      verdict,
    };
  }

  async getActivityLineage(tenantId: string, activityId: string): Promise<AIActivityLineage> {
    const graph = await this.getActivityGraph(tenantId, activityId);
    const evaluation = await this.evaluateAIValueAttribution(tenantId, activityId);
    return { ...graph, evaluation };
  }

  /** Workstream 11: pure aggregation reused by the Executive Proof Pack "AI Value Summary" section. No new proof pack type. */
  async generateAIValueSummary(tenantId: string): Promise<AIValueSummary> {
    const [activities, attributions] = await Promise.all([
      this.repo.listActivities(tenantId),
      this.repo.listAttributions(tenantId),
    ]);
    const workflowLinks = (await Promise.all(activities.map((a) => this.repo.listWorkflowLinks(tenantId, { activityId: a.id })))).flat();
    const outcomeLinks = (await Promise.all(activities.map((a) => this.repo.listOutcomeLinks(tenantId, { activityId: a.id })))).flat();
    const confidences = attributions.map((a) => a.attributionConfidence).filter((c): c is number => c !== undefined);
    return {
      activityCount: activities.length,
      attributionCount: attributions.length,
      totalAttributedValue: attributions.reduce((sum, a) => sum + a.attributedValueAmount, 0),
      averageConfidence: confidences.length ? Math.round((confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 1000) / 1000 : 0,
      linkedWorkflowIds: [...new Set(workflowLinks.map((l) => l.workflowId))],
      linkedOutcomeIds: [...new Set(outcomeLinks.map((l) => l.outcomeId))],
      evidenceCount: attributions.filter((a) => a.evidenceItemId).length,
    };
  }

  // ─── Program AI1 — Multi-Source Attribution ──────────────────────────────

  /**
   * Replaces the full contributor set for an attribution. Weights must sum to
   * exactly 100 — rejected (not silently normalised) otherwise, since silent
   * normalisation would fabricate a distribution the caller never asserted.
   */
  async setContributors(tenantId: string, attributionId: string, contributors: SetContributorsInput[]): Promise<AttributionContributor[]> {
    await this.requireAttribution(tenantId, attributionId);
    const totalWeight = contributors.reduce((sum, c) => sum + c.weight, 0);
    if (Math.round(totalWeight * 100) / 100 !== 100) {
      throw new Error(`contributor weights must sum to exactly 100, got ${totalWeight}`);
    }
    const existing = await this.repo.listContributors(tenantId, { attributionId });
    await Promise.all(existing.map((c) => this.repo.upsertContributor({ ...c, weight: 0 })));
    const now = new Date().toISOString();
    return Promise.all(contributors.map((c) => this.repo.upsertContributor({
      id: randomUUID(),
      tenantId,
      attributionId,
      contributorType: c.contributorType,
      contributorId: c.contributorId,
      label: c.label,
      weight: c.weight,
      createdAt: now,
    })));
  }

  async listContributors(tenantId: string, attributionId: string): Promise<AttributionContributor[]> {
    const all = await this.repo.listContributors(tenantId, { attributionId });
    return all.filter((c) => c.weight > 0);
  }

  // ─── Program AI1 — Attribution Evidence Registry ─────────────────────────

  async addEvidence(tenantId: string, attributionId: string, input: AddEvidenceInput): Promise<AttributionEvidenceRecord> {
    await this.requireAttribution(tenantId, attributionId);
    const record: AttributionEvidenceRecord = {
      id: randomUUID(),
      tenantId,
      attributionId,
      evidenceType: input.evidenceType,
      evidenceStrength: input.evidenceStrength,
      source: input.source,
      timestamp: input.timestamp,
      confidenceContribution: input.confidenceContribution,
      description: input.description,
      createdAt: new Date().toISOString(),
    };
    return this.repo.upsertEvidence(record);
  }

  listEvidence(tenantId: string, attributionId: string): Promise<AttributionEvidenceRecord[]> {
    return this.repo.listEvidence(tenantId, { attributionId });
  }

  private async requireAttribution(tenantId: string, attributionId: string): Promise<AIValueAttribution> {
    const attribution = await this.repo.getAttribution(tenantId, attributionId);
    if (!attribution) throw new Error(`ai attribution not found: ${attributionId}`);
    return attribution;
  }

  // ─── Program AI1 — Attribution Confidence Engine ─────────────────────────

  /**
   * Recomputes and persists confidenceScore/confidenceLevel/confidenceReasoning from the
   * attribution's currently-attached evidence and contributors. Never invents inputs: an
   * attribution with no evidence yields LOW confidence with an explicit "no evidence" reason,
   * it is never defaulted to a higher score.
   */
  async recomputeConfidence(tenantId: string, attributionId: string, signalStable?: boolean, timeCorrelationHours?: number): Promise<AIValueAttribution> {
    const attribution = await this.requireAttribution(tenantId, attributionId);
    const [evidence, contributors] = await Promise.all([
      this.repo.listEvidence(tenantId, { attributionId }),
      this.listContributors(tenantId, attributionId),
    ]);
    const sources = new Set<string>([...evidence.map((e) => e.source), ...contributors.map((c) => c.contributorId)]);
    const result = computeAttributionConfidence({
      evidenceStrengths: evidence.map((e) => e.evidenceStrength),
      distinctSourceCount: sources.size,
      signalStable,
      timeCorrelationHours,
    });
    const updated: AIValueAttribution = {
      ...attribution,
      confidenceScore: result.score,
      confidenceLevel: result.level,
      confidenceReasoning: result.reasoning,
      updatedAt: new Date().toISOString(),
    };
    return this.repo.upsertAttribution(updated);
  }

  // ─── Program AI1 — Attribution Lineage ───────────────────────────────────

  async getAttributionLineage(tenantId: string, attributionId: string): Promise<AttributionLineage> {
    const attribution = await this.requireAttribution(tenantId, attributionId);
    const [evidence, contributors, activity] = await Promise.all([
      this.repo.listEvidence(tenantId, { attributionId }),
      this.listContributors(tenantId, attributionId),
      attribution.activityId ? this.repo.getActivity(tenantId, attribution.activityId) : Promise.resolve(undefined),
    ]);
    const objectiveIds = attribution.assetId
      ? await this.resolvers.listBusinessObjectivesForAsset?.(tenantId, attribution.assetId) ?? []
      : [];
    const complete = Boolean(activity || !attribution.activityId) && evidence.length > 0 && contributors.length > 0;
    return {
      attributionId,
      tenantId,
      activity,
      evidence,
      attribution,
      contributors,
      outcomeId: attribution.outcomeId,
      valueSignalId: attribution.valueSignalId,
      objectiveIds,
      complete,
    };
  }

  // ─── Program AI1 — Attribution Decision Framework ────────────────────────

  async recommendAttributionAction(tenantId: string, attributionId: string, signalStable?: boolean): Promise<AttributionRecommendation> {
    const attribution = await this.requireAttribution(tenantId, attributionId);
    const [evidence, contributors] = await Promise.all([
      this.repo.listEvidence(tenantId, { attributionId }),
      this.listContributors(tenantId, attributionId),
    ]);
    const confidenceLevel = attribution.confidenceLevel ?? 'LOW';
    const confidenceScore = attribution.confidenceScore ?? 0;
    return recommendAttributionAction({ attributionId, confidenceLevel, confidenceScore, evidence, contributors, signalStable });
  }
}

export const aiValueAttributionService = new AIValueAttributionService();
