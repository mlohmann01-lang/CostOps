import { randomUUID } from 'node:crypto';
import { DecisionAuthorityRepository, decisionAuthorityRepository } from './decision-authority-repository';
import type {
  Decision,
  DecisionAsset,
  DecisionAssetRelationshipType,
  DecisionEvidence,
  DecisionEvidenceRelationshipType,
  DecisionLineage,
  DecisionOutcome,
  DecisionOutcomeRelationshipType,
  DecisionPrincipal,
  DecisionPrincipalRole,
  DecisionType,
  TrustSnapshot,
} from './decision-authority-types';

export interface CreateDecisionInput {
  tenantId: string;
  decisionType: DecisionType;
  title: string;
  description?: string;
  rationale: string[];
  sourceSystem: string;
  sourceReference: string;
  primaryAssetId?: string;
  primaryOwnerPrincipalId?: string;
  decisionMakerPrincipalId?: string;
  approverPrincipalId?: string;
  trustSnapshot?: TrustSnapshot;
  metadata?: Record<string, unknown>;
}

const ILLEGAL_TRANSITION = (from: string, to: string) => new Error(`cannot transition decision from ${from} to ${to}`);

export class DecisionAuthorityService {
  constructor(private readonly repo: DecisionAuthorityRepository = decisionAuthorityRepository) {}

  async createDecision(input: CreateDecisionInput): Promise<Decision> {
    const now = new Date().toISOString();
    const decision: Decision = {
      id: randomUUID(),
      tenantId: input.tenantId,
      decisionType: input.decisionType,
      status: 'PROPOSED',
      title: input.title,
      description: input.description,
      rationale: input.rationale,
      sourceSystem: input.sourceSystem,
      sourceReference: input.sourceReference,
      createdAt: now,
      updatedAt: now,
      primaryAssetId: input.primaryAssetId,
      primaryOwnerPrincipalId: input.primaryOwnerPrincipalId,
      decisionMakerPrincipalId: input.decisionMakerPrincipalId,
      approverPrincipalId: input.approverPrincipalId,
      trustSnapshot: input.trustSnapshot,
      metadata: input.metadata ?? {},
    };
    return this.repo.upsertDecision(decision);
  }

  async attachAsset(tenantId: string, decisionId: string, assetId: string, relationshipType: DecisionAssetRelationshipType): Promise<DecisionAsset> {
    const link: DecisionAsset = { id: randomUUID(), tenantId, decisionId, assetId, relationshipType, createdAt: new Date().toISOString() };
    return this.repo.upsertDecisionAsset(link);
  }

  async attachEvidence(tenantId: string, decisionId: string, evidenceItemId: string, relationshipType: DecisionEvidenceRelationshipType): Promise<DecisionEvidence> {
    const link: DecisionEvidence = { id: randomUUID(), tenantId, decisionId, evidenceItemId, relationshipType, createdAt: new Date().toISOString() };
    return this.repo.upsertDecisionEvidence(link);
  }

  async attachPrincipal(tenantId: string, decisionId: string, principalId: string, role: DecisionPrincipalRole): Promise<DecisionPrincipal> {
    const link: DecisionPrincipal = { id: randomUUID(), tenantId, decisionId, principalId, role, createdAt: new Date().toISOString() };
    return this.repo.upsertDecisionPrincipal(link);
  }

  async attachOutcome(tenantId: string, decisionId: string, outcomeId: string, relationshipType: DecisionOutcomeRelationshipType): Promise<DecisionOutcome> {
    const link: DecisionOutcome = { id: randomUUID(), tenantId, decisionId, outcomeId, relationshipType, createdAt: new Date().toISOString() };
    return this.repo.upsertDecisionOutcome(link);
  }

  private async requireDecision(tenantId: string, decisionId: string): Promise<Decision> {
    const decision = await this.repo.getDecision(tenantId, decisionId);
    if (!decision) throw new Error(`decision not found: ${decisionId}`);
    return decision;
  }

  /** Trust snapshot is captured once at creation and never overwritten by later transitions. */
  private async transition(tenantId: string, decisionId: string, allowedFrom: Decision['status'][], to: Decision['status'], patch: Partial<Decision> = {}): Promise<Decision> {
    const decision = await this.requireDecision(tenantId, decisionId);
    if (!allowedFrom.includes(decision.status)) throw ILLEGAL_TRANSITION(decision.status, to);
    const updated: Decision = { ...decision, ...patch, trustSnapshot: decision.trustSnapshot, status: to, updatedAt: new Date().toISOString() };
    return this.repo.upsertDecision(updated);
  }

  approveDecision(tenantId: string, decisionId: string, approverPrincipalId?: string) {
    return this.transition(tenantId, decisionId, ['PROPOSED', 'REVIEWING'], 'APPROVED', {
      approvedAt: new Date().toISOString(),
      ...(approverPrincipalId ? { approverPrincipalId } : {}),
    });
  }

  rejectDecision(tenantId: string, decisionId: string) {
    return this.transition(tenantId, decisionId, ['PROPOSED', 'REVIEWING'], 'REJECTED');
  }

  markExecuted(tenantId: string, decisionId: string) {
    return this.transition(tenantId, decisionId, ['APPROVED'], 'EXECUTED', { executedAt: new Date().toISOString() });
  }

  markVerified(tenantId: string, decisionId: string) {
    return this.transition(tenantId, decisionId, ['EXECUTED'], 'VERIFIED', { verifiedAt: new Date().toISOString() });
  }

  markProtected(tenantId: string, decisionId: string) {
    return this.transition(tenantId, decisionId, ['VERIFIED'], 'PROTECTED', { protectedAt: new Date().toISOString() });
  }

  listDecisions(tenantId: string, filters: Record<string, unknown> = {}) {
    return this.repo.listDecisions(tenantId, filters);
  }

  getDecision(tenantId: string, decisionId: string) {
    return this.repo.getDecision(tenantId, decisionId);
  }

  async listDecisionsBySource(tenantId: string, sourceSystem: string, sourceReference: string): Promise<Decision[]> {
    return this.repo.listDecisions(tenantId, { sourceSystem, sourceReference });
  }

  async getDecisionLineage(tenantId: string, decisionId: string): Promise<DecisionLineage> {
    const decision = await this.requireDecision(tenantId, decisionId);
    const [assets, principals, evidence, outcomes] = await Promise.all([
      this.repo.listDecisionAssets(tenantId, { decisionId }),
      this.repo.listDecisionPrincipals(tenantId, { decisionId }),
      this.repo.listDecisionEvidence(tenantId, { decisionId }),
      this.repo.listDecisionOutcomes(tenantId, { decisionId }),
    ]);
    return { decision, assets, principals, evidence, outcomes };
  }
}

export const decisionAuthorityService = new DecisionAuthorityService();
