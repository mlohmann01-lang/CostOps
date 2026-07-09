import { randomUUID } from 'node:crypto';
import { WorkflowValueGraphRepository, workflowValueGraphRepository } from './workflow-value-graph-repository';
import type {
  Workflow, WorkflowAsset, WorkflowAssetRelationshipType, WorkflowDecision, WorkflowDecisionRelationshipType,
  WorkflowEvaluation, WorkflowGraph, WorkflowInvestment, WorkflowInvestmentRelationshipType, WorkflowLineage,
  WorkflowOutcome, WorkflowOutcomeRelationshipType, WorkflowPrincipal, WorkflowPrincipalRelationshipType,
  WorkflowStatus, WorkflowType, WorkflowValueSignal,
} from './workflow-value-graph-types';

export interface CreateWorkflowInput {
  tenantId: string;
  name: string;
  description?: string;
  workflowType: WorkflowType;
  status?: WorkflowStatus;
  ownerPrincipalId?: string;
  sourceSystem: string;
  sourceReference: string;
  metadata?: Record<string, unknown>;
}

export interface CreateOrUpdateWorkflowInput extends CreateWorkflowInput {
  id?: string;
}

/** Minimal shapes resolved by other authorities; kept loose so this service has no hard dependency on their packages. */
export interface ResolvedValueSignal { targetValue?: number; verifiedValue?: number; confidence?: number }
export interface ResolvedDecision { outcomeValueSummary?: { protectedValue?: number } }

export interface WorkflowValueGraphResolvers {
  resolveValueSignal?(tenantId: string, valueSignalId: string): Promise<ResolvedValueSignal | undefined>;
  resolveDecision?(tenantId: string, decisionId: string): Promise<ResolvedDecision | undefined>;
}

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-');

export class WorkflowValueGraphService {
  constructor(
    private readonly repo: WorkflowValueGraphRepository = workflowValueGraphRepository,
    private readonly resolvers: WorkflowValueGraphResolvers = {},
  ) {}

  async createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
    const now = new Date().toISOString();
    const workflow: Workflow = {
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      normalizedName: normalize(input.name),
      description: input.description,
      workflowType: input.workflowType,
      status: input.status ?? 'ACTIVE',
      ownerPrincipalId: input.ownerPrincipalId,
      sourceSystem: input.sourceSystem,
      sourceReference: input.sourceReference,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };
    return this.repo.upsertWorkflow(workflow);
  }

  /** Idempotent upsert keyed by (sourceSystem, sourceReference) when no id is supplied, so backfills can be re-run safely. */
  async createOrUpdateWorkflow(input: CreateOrUpdateWorkflowInput): Promise<Workflow> {
    const now = new Date().toISOString();
    let existing: Workflow | undefined;
    if (input.id) existing = await this.repo.getWorkflow(input.tenantId, input.id);
    if (!existing) {
      const bySource = await this.repo.listWorkflows(input.tenantId, { sourceSystem: input.sourceSystem, sourceReference: input.sourceReference });
      existing = bySource[0];
    }
    const workflow: Workflow = {
      id: existing?.id ?? input.id ?? randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      normalizedName: normalize(input.name),
      description: input.description ?? existing?.description,
      workflowType: input.workflowType,
      status: input.status ?? existing?.status ?? 'ACTIVE',
      ownerPrincipalId: input.ownerPrincipalId ?? existing?.ownerPrincipalId,
      sourceSystem: input.sourceSystem,
      sourceReference: input.sourceReference,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
    };
    return this.repo.upsertWorkflow(workflow);
  }

  async linkWorkflowToAsset(tenantId: string, workflowId: string, assetId: string, relationshipType: WorkflowAssetRelationshipType, confidence?: number): Promise<WorkflowAsset> {
    const link: WorkflowAsset = { id: randomUUID(), tenantId, workflowId, assetId, relationshipType, confidence, createdAt: new Date().toISOString() };
    return this.repo.upsertWorkflowAsset(link);
  }

  async linkWorkflowToPrincipal(tenantId: string, workflowId: string, principalId: string, relationshipType: WorkflowPrincipalRelationshipType, confidence?: number): Promise<WorkflowPrincipal> {
    const link: WorkflowPrincipal = { id: randomUUID(), tenantId, workflowId, principalId, relationshipType, confidence, createdAt: new Date().toISOString() };
    return this.repo.upsertWorkflowPrincipal(link);
  }

  async linkWorkflowToDecision(tenantId: string, workflowId: string, decisionId: string, relationshipType: WorkflowDecisionRelationshipType, confidence?: number): Promise<WorkflowDecision> {
    const link: WorkflowDecision = { id: randomUUID(), tenantId, workflowId, decisionId, relationshipType, confidence, createdAt: new Date().toISOString() };
    return this.repo.upsertWorkflowDecision(link);
  }

  async linkWorkflowToOutcome(tenantId: string, workflowId: string, outcomeId: string, relationshipType: WorkflowOutcomeRelationshipType, confidence?: number): Promise<WorkflowOutcome> {
    const link: WorkflowOutcome = { id: randomUUID(), tenantId, workflowId, outcomeId, relationshipType, confidence, createdAt: new Date().toISOString() };
    return this.repo.upsertWorkflowOutcome(link);
  }

  async linkWorkflowToInvestment(tenantId: string, workflowId: string, investmentId: string, relationshipType: WorkflowInvestmentRelationshipType, confidence?: number): Promise<WorkflowInvestment> {
    const link: WorkflowInvestment = { id: randomUUID(), tenantId, workflowId, investmentId, relationshipType, confidence, createdAt: new Date().toISOString() };
    return this.repo.upsertWorkflowInvestment(link);
  }

  async linkWorkflowToValueSignal(tenantId: string, workflowId: string, valueSignalId: string, confidence?: number): Promise<WorkflowValueSignal> {
    const link: WorkflowValueSignal = { id: randomUUID(), tenantId, workflowId, valueSignalId, confidence, createdAt: new Date().toISOString() };
    return this.repo.upsertWorkflowValueSignal(link);
  }

  getWorkflowById(tenantId: string, workflowId: string): Promise<Workflow | undefined> {
    return this.repo.getWorkflow(tenantId, workflowId);
  }

  listWorkflows(tenantId: string, filters: Record<string, unknown> = {}): Promise<Workflow[]> {
    return this.repo.listWorkflows(tenantId, filters);
  }

  private async requireWorkflow(tenantId: string, workflowId: string): Promise<Workflow> {
    const workflow = await this.repo.getWorkflow(tenantId, workflowId);
    if (!workflow) throw new Error(`workflow not found: ${workflowId}`);
    return workflow;
  }

  async getWorkflowGraph(tenantId: string, workflowId: string): Promise<WorkflowGraph> {
    const workflow = await this.requireWorkflow(tenantId, workflowId);
    const [assets, principals, decisions, outcomes, investments, valueSignals] = await Promise.all([
      this.repo.listWorkflowAssets(tenantId, { workflowId }),
      this.repo.listWorkflowPrincipals(tenantId, { workflowId }),
      this.repo.listWorkflowDecisions(tenantId, { workflowId }),
      this.repo.listWorkflowOutcomes(tenantId, { workflowId }),
      this.repo.listWorkflowInvestments(tenantId, { workflowId }),
      this.repo.listWorkflowValueSignals(tenantId, { workflowId }),
    ]);
    return { workflow, assets, principals, decisions, outcomes, investments, valueSignals };
  }

  /** Workstream 8: lets Decision Authority (or its UI) surface workflow context without owning workflow linkage itself. */
  async getWorkflowsForDecision(tenantId: string, decisionId: string): Promise<Workflow[]> {
    const links = await this.repo.listWorkflowDecisions(tenantId, { decisionId });
    const workflows = await Promise.all(links.map((link) => this.repo.getWorkflow(tenantId, link.workflowId)));
    return workflows.filter((w): w is Workflow => Boolean(w));
  }

  /** Workstream 9: lets Value Realisation Authority surface workflow context for an investment's attribution path. */
  async getWorkflowsForInvestment(tenantId: string, investmentId: string): Promise<Workflow[]> {
    const links = await this.repo.listWorkflowInvestments(tenantId, { investmentId });
    const workflows = await Promise.all(links.map((link) => this.repo.getWorkflow(tenantId, link.workflowId)));
    return workflows.filter((w): w is Workflow => Boolean(w));
  }

  /** Deterministic, no-LLM evaluation mirroring Value Realisation Authority's verdict/confidence rules. */
  async evaluateWorkflow(tenantId: string, workflowId: string): Promise<WorkflowEvaluation> {
    const graph = await this.getWorkflowGraph(tenantId, workflowId);
    const resolvedSignals = (await Promise.all(
      graph.valueSignals.map((link) => this.resolvers.resolveValueSignal?.(tenantId, link.valueSignalId)),
    )).filter((s): s is ResolvedValueSignal => Boolean(s));
    const resolvedDecisions = (await Promise.all(
      graph.decisions.map((link) => this.resolvers.resolveDecision?.(tenantId, link.decisionId)),
    )).filter((d): d is ResolvedDecision => Boolean(d));

    const projectedValue = resolvedSignals.reduce((sum, s) => sum + (s.targetValue ?? 0), 0);
    const verifiedValue = resolvedSignals.reduce((sum, s) => sum + (s.verifiedValue ?? 0), 0);
    const protectedValue = resolvedDecisions.reduce((sum, d) => sum + (d.outcomeValueSummary?.protectedValue ?? 0), 0);

    const investmentCount = graph.investments.length;
    const decisionCount = graph.decisions.length;
    const outcomeCount = graph.outcomes.length;
    const assetCount = graph.assets.length;
    const principalCount = graph.principals.length;

    let verdict: WorkflowEvaluation['verdict'];
    if (graph.valueSignals.length === 0 && outcomeCount === 0) {
      verdict = 'INSUFFICIENT_EVIDENCE';
    } else if (projectedValue > 0 && verifiedValue >= projectedValue) {
      verdict = 'VALUE_PRODUCING';
    } else if (verifiedValue > 0) {
      verdict = 'PARTIAL_VALUE';
    } else if (outcomeCount > 0 && verifiedValue === 0) {
      verdict = 'NO_VERIFIED_VALUE';
    } else {
      verdict = 'INSUFFICIENT_EVIDENCE';
    }

    let confidence = 0.5;
    if (verdict === 'INSUFFICIENT_EVIDENCE') confidence = 0.1;
    else if (verdict === 'VALUE_PRODUCING') confidence = 0.85;
    else if (verdict === 'PARTIAL_VALUE') confidence = 0.6;
    else if (verdict === 'NO_VERIFIED_VALUE') confidence = 0.4;

    if (protectedValue > 0) confidence = Math.min(1, confidence + 0.1);
    const lowConfidenceSignals = resolvedSignals.filter((s) => s.confidence !== undefined && s.confidence < 0.5);
    if (lowConfidenceSignals.length > 0) confidence = Math.max(0, confidence - 0.15);

    return {
      workflowId,
      investmentCount,
      decisionCount,
      outcomeCount,
      assetCount,
      principalCount,
      projectedValue,
      verifiedValue,
      protectedValue,
      confidence: Math.round(confidence * 1000) / 1000,
      verdict,
    };
  }

  async getWorkflowLineage(tenantId: string, workflowId: string): Promise<WorkflowLineage> {
    const graph = await this.getWorkflowGraph(tenantId, workflowId);
    const evaluation = await this.evaluateWorkflow(tenantId, workflowId);
    return { ...graph, evaluation };
  }
}

export const workflowValueGraphService = new WorkflowValueGraphService();
