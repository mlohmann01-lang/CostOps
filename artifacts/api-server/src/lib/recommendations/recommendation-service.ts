import { buildGovernedRecommendation } from "./recommendation-builder";
import { GovernedRecommendationRepository } from "./recommendation-repository";
import type { GovernedRecommendationObject } from "./types";
import { RecommendationGovernanceEventService } from "./governance-event-service";

export class GovernedRecommendationService {
  constructor(private readonly repo = new GovernedRecommendationRepository(), private readonly events = new RecommendationGovernanceEventService()) {}

  async recalculate(tenantId: string, recommendationId: string) {
    const existing = await this.repo.getByRecommendationId(tenantId, recommendationId);
    if (!existing) return null;
    const rebuilt = buildGovernedRecommendation({
      recommendationId: existing.recommendationId,
      tenantId: existing.tenantId,
      playbookId: existing.playbookId,
      targetEntityId: existing.targetEntityId,
      targetEntityType: existing.targetEntityType,
      graphNodeIds: existing.graphNodeIds as string[],
      graphEdgeIds: existing.graphEdgeIds as string[],
      discoveryLifecycleState: existing.discoveryLifecycleState as any,
      confidenceScore: Number(existing.confidenceScore),
      reliabilityBand: existing.reliabilityBand as any,
      projectedMonthlySavings: Number(existing.projectedMonthlySavings),
      projectedAnnualSavings: Number(existing.projectedAnnualSavings),
      savingsConfidence: existing.savingsConfidence as any,
      actionType: existing.actionType,
      actionRiskClass: existing.actionRiskClass as any,
      evidencePointers: existing.evidencePointers as string[],
      hasApproval: existing.recommendationState === "EXECUTION_READY",
    });
    const row = await this.repo.upsert(tenantId, rebuilt, existing.sourceReferences as string[]);
    await this.events.emit({ tenantId, recommendationId, eventType: "RECOMMENDATION_RECALCULATED", actorId: "system", actorRole: "SYSTEM", beforeState: String(existing.recommendationState), afterState: String(row.recommendationState), beforeReadiness: String(existing.executionReadiness), afterReadiness: String(row.executionReadiness), evidenceSnapshot: row.evidencePointers as unknown[], blockedReasonsSnapshot: row.blockedReasons as unknown[], readinessReasonsSnapshot: row.readinessReasons as unknown[] });
    if (existing.executionReadiness !== row.executionReadiness) await this.events.emit({ tenantId, recommendationId, eventType: "READINESS_CHANGED", actorId: "system", actorRole: "SYSTEM", beforeReadiness: String(existing.executionReadiness), afterReadiness: String(row.executionReadiness) });
    return row;
  }

  async approve(tenantId: string, recommendationId: string, approvedBy: string) {
    const existing = await this.repo.getByRecommendationId(tenantId, recommendationId);
    if (!existing) return null;
    const rebuilt = buildGovernedRecommendation({
      recommendationId: existing.recommendationId,
      tenantId: existing.tenantId,
      playbookId: existing.playbookId,
      targetEntityId: existing.targetEntityId,
      targetEntityType: existing.targetEntityType,
      graphNodeIds: existing.graphNodeIds as string[],
      graphEdgeIds: existing.graphEdgeIds as string[],
      discoveryLifecycleState: existing.discoveryLifecycleState as any,
      confidenceScore: Number(existing.confidenceScore),
      reliabilityBand: existing.reliabilityBand as any,
      projectedMonthlySavings: Number(existing.projectedMonthlySavings),
      projectedAnnualSavings: Number(existing.projectedAnnualSavings),
      savingsConfidence: existing.savingsConfidence as any,
      actionType: existing.actionType,
      actionRiskClass: existing.actionRiskClass as any,
      evidencePointers: existing.evidencePointers as string[],
      hasApproval: true,
    });
    const row = await this.repo.upsert(tenantId, rebuilt, [...(existing.sourceReferences as string[]), `approval:${approvedBy}`]);
    if (row.executionReadiness === "APPROVAL_REQUIRED" || row.executionReadiness === "BLOCKED") {
      await this.events.emit({ tenantId, recommendationId, eventType: "APPROVAL_REJECTED", actorId: approvedBy, actorRole: "OPERATOR", eventReason: "READINESS_RULES_BLOCK_APPROVAL", beforeState: String(existing.recommendationState), afterState: String(row.recommendationState), beforeReadiness: String(existing.executionReadiness), afterReadiness: String(row.executionReadiness) });
      return row;
    }
    await this.events.emit({ tenantId, recommendationId, eventType: "RECOMMENDATION_APPROVED", actorId: approvedBy, actorRole: "OPERATOR", beforeState: String(existing.recommendationState), afterState: String(row.recommendationState), beforeReadiness: String(existing.executionReadiness), afterReadiness: String(row.executionReadiness), approvalSnapshot: { approvedBy } });
    return row;
  }

  async block(tenantId: string, recommendationId: string, reason: string, blockedBy: string) {
    const existing = await this.repo.getByRecommendationId(tenantId, recommendationId);
    if (!existing) return null;
    const blocked: GovernedRecommendationObject = {
      recommendationId: existing.recommendationId,
      tenantId: existing.tenantId,
      playbookId: existing.playbookId,
      targetEntityId: existing.targetEntityId,
      targetEntityType: existing.targetEntityType,
      graphNodeIds: existing.graphNodeIds as string[],
      graphEdgeIds: existing.graphEdgeIds as string[],
      discoveryLifecycleState: existing.discoveryLifecycleState as any,
      confidenceScore: Number(existing.confidenceScore),
      reliabilityBand: existing.reliabilityBand as any,
      projectedMonthlySavings: Number(existing.projectedMonthlySavings),
      projectedAnnualSavings: Number(existing.projectedAnnualSavings),
      savingsConfidence: existing.savingsConfidence as any,
      actionType: existing.actionType,
      actionRiskClass: existing.actionRiskClass as any,
      executionReadiness: "BLOCKED",
      recommendationState: "BLOCKED",
      readinessReasons: existing.readinessReasons as string[],
      blockedReasons: Array.from(new Set([...(existing.blockedReasons as string[]), reason])),
      requiredApprovals: existing.requiredApprovals as string[],
      evidencePointers: existing.evidencePointers as string[],
      createdAt: existing.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const row = await this.repo.upsert(tenantId, blocked, [...(existing.sourceReferences as string[]), `blocked:${blockedBy}`]);
    await this.events.emit({ tenantId, recommendationId, eventType: "RECOMMENDATION_BLOCKED", actorId: blockedBy, actorRole: "OPERATOR", eventReason: reason, beforeState: String(existing.recommendationState), afterState: "BLOCKED", beforeReadiness: String(existing.executionReadiness), afterReadiness: "BLOCKED", blockedReasonsSnapshot: row.blockedReasons as unknown[] });
    return row;
  }
}
