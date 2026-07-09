import { DecisionAuthorityService, decisionAuthorityService } from './decision-authority-service';
import { buildDecisionRationale } from './decision-authority-reasoning';
import type { Decision, TrustSnapshot } from './decision-authority-types';

/**
 * Additive glue between existing M365 governance workflows and the Decision
 * Authority ledger. Callers invoke these functions from existing service
 * methods; nothing here introduces a new user-facing action.
 */
export class DecisionLifecycleBridge {
  constructor(private readonly decisions: DecisionAuthorityService = decisionAuthorityService) {}

  private async findBySourceReference(tenantId: string, sourceSystem: string, sourceReference: string): Promise<Decision | undefined> {
    const matches = await this.decisions.listDecisionsBySource(tenantId, sourceSystem, sourceReference);
    return matches[0];
  }

  async recordExecutionApproval(input: {
    tenantId: string;
    recommendationId: string;
    actorId: string;
    targetEntityId?: string;
    evidencePointers?: string[];
    projectedMonthlySavings?: number;
    policyMinimumMonthlySavings?: number;
    trustSnapshot?: TrustSnapshot;
  }): Promise<Decision> {
    const existing = await this.findBySourceReference(input.tenantId, 'RECOMMENDATION_APPROVAL', input.recommendationId);
    if (existing) return existing;

    const rationale = buildDecisionRationale({
      evidenceCount: input.evidencePointers?.length ?? 0,
      approverPrincipalId: input.actorId,
      trustSnapshot: input.trustSnapshot,
      trustThreshold: 60,
      projectedSavings: input.projectedMonthlySavings,
      policyMinimumSavings: input.policyMinimumMonthlySavings,
    });

    const decision = await this.decisions.createDecision({
      tenantId: input.tenantId,
      decisionType: 'EXECUTION_APPROVAL',
      title: `Execution approved for ${input.recommendationId}`,
      rationale,
      sourceSystem: 'RECOMMENDATION_APPROVAL',
      sourceReference: input.recommendationId,
      primaryAssetId: input.targetEntityId,
      decisionMakerPrincipalId: input.actorId,
      approverPrincipalId: input.actorId,
      trustSnapshot: input.trustSnapshot,
      metadata: { recommendationId: input.recommendationId },
    });

    await this.decisions.attachPrincipal(input.tenantId, decision.id, input.actorId, 'APPROVER');
    if (input.targetEntityId) await this.decisions.attachAsset(input.tenantId, decision.id, input.targetEntityId, 'PRIMARY');
    for (const evidenceId of input.evidencePointers ?? []) {
      await this.decisions.attachEvidence(input.tenantId, decision.id, evidenceId, 'SUPPORTING');
    }
    await this.decisions.approveDecision(input.tenantId, decision.id, input.actorId);
    return this.decisions.markExecuted(input.tenantId, decision.id);
  }

  async recordOutcomeVerification(input: { tenantId: string; recommendationId: string; outcomeId: string; verified: boolean }): Promise<Decision | undefined> {
    const decision = await this.findBySourceReference(input.tenantId, 'RECOMMENDATION_APPROVAL', input.recommendationId);
    if (!decision) return undefined;
    await this.decisions.attachOutcome(input.tenantId, decision.id, input.outcomeId, input.verified ? 'VERIFIED' : 'EXPECTED');
    if (!input.verified || decision.status !== 'EXECUTED') return decision;
    return this.decisions.markVerified(input.tenantId, decision.id);
  }

  async recordOutcomeProtection(input: { tenantId: string; recommendationId: string; outcomeId: string }): Promise<Decision | undefined> {
    const decision = await this.findBySourceReference(input.tenantId, 'RECOMMENDATION_APPROVAL', input.recommendationId);
    if (!decision || decision.status !== 'VERIFIED') return decision;
    await this.decisions.attachOutcome(input.tenantId, decision.id, input.outcomeId, 'PROTECTED');
    return this.decisions.markProtected(input.tenantId, decision.id);
  }
}

export const decisionLifecycleBridge = new DecisionLifecycleBridge();
