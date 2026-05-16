import { db, playbookEvaluationEventsTable, recommendationsTable, suppressedRecommendationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { PLAYBOOK_REGISTRY } from "./registry";
import { ExecutionOrchestrationRepository } from "../execution-orchestration/execution-orchestration.repository";
import { assessTrust } from "../trust-engine";
import { buildRecommendationExplainability } from "../recommendations/recommendation-explainability";
import { buildExplainabilityEnvelope } from "../recommendations/explainability-surface";
import { RecommendationRationalePersistenceService } from "../recommendations/recommendation-rationale-persistence-service";

export type M365EvidenceRecord = Record<string, any>;

export class PlaybookRecommendationService {
  private repo = new ExecutionOrchestrationRepository();
  private rationaleService = new RecommendationRationalePersistenceService();

  async generateRecommendationsForTenant(input: { tenantId: string; source: "DEMO"|"M365_SYNC"|"MANUAL_IMPORT"; evidenceRecords: M365EvidenceRecord[]; actorId?: string; trustBand?: string; connectorTrustSnapshotId?: number; findingsBlock?: boolean; }) {
    const recommendations: any[] = []; const suppressed: any[] = []; const evaluationEvents: any[] = [];
    for (const evidence of input.evidenceRecords) {
      for (const playbook of PLAYBOOK_REGISTRY) {
        const mapped: any = { ...evidence, email: evidence.email ?? evidence.userPrincipalName, displayName: evidence.displayName ?? evidence.userPrincipalName, sku: evidence.sku ?? evidence.assignedLicenses?.[0] ?? "UNKNOWN", cost: evidence.cost ?? 0, days: evidence.days ?? evidence.lastLoginDaysAgo ?? 999 };
        const evaluation = playbook.evaluate(mapped as any);
        const missingSignals = (evaluation.requiredSignals ?? []).filter((s:string)=> mapped[s] == null && !(s === "assignedLicenses" && (mapped.assignedLicenses?.length ?? 0) > 0));
        const correlationId = `pb:${playbook.id}:${mapped.email}:${Date.now()}`;
        const event = (await db.insert(playbookEvaluationEventsTable).values({ tenantId: input.tenantId, ingestionRunId: String(input.source), playbookId: playbook.id, playbookName: playbook.name, candidateType: "USER", candidateId: mapped.email, candidateDisplayName: mapped.displayName ?? mapped.email, matched: String(evaluation.matched), reason: evaluation.reason, recommendedAction: Array.isArray(evaluation.recommendedAction)?evaluation.recommendedAction.join("+"):evaluation.recommendedAction, exclusions: evaluation.exclusions, requiredSignals: evaluation.requiredSignals, missingSignals, evidence: evaluation.evidence }).returning())[0];
        evaluationEvents.push(event);

        let suppression: any = null;
        if (missingSignals.length > 0) suppression = { reasonCode: "MISSING_REQUIRED_EVIDENCE", reasonText: `Missing: ${missingSignals.join(",")}` };
        else if ((evaluation.exclusions ?? []).some((e:string)=>e.includes("admin"))) suppression = { reasonCode: "EXCLUDED_ADMIN_ACCOUNT", reasonText: "Excluded admin account" };
        else if ((evaluation.exclusions ?? []).some((e:string)=>e.includes("service"))) suppression = { reasonCode: "EXCLUDED_SERVICE_ACCOUNT", reasonText: "Excluded service account" };
        else if ((evaluation.exclusions ?? []).some((e:string)=>e.includes("shared"))) suppression = { reasonCode: "EXCLUDED_SHARED_MAILBOX", reasonText: "Excluded shared mailbox" };
        else if (!evaluation.matched) suppression = { reasonCode: "TRUST_REQUIREMENT_FAILED", reasonText: "Playbook trigger not matched" };

        if (!suppression && input.trustBand === "QUARANTINED") suppression = { reasonCode: "CONNECTOR_TRUST_QUARANTINED", reasonText: "Connector trust is quarantined" };
        else if (!suppression && input.findingsBlock) suppression = { reasonCode: "RECONCILIATION_FINDINGS_BLOCK", reasonText: "Open high severity reconciliation findings" };

        if (suppression) {
          const row = (await db.insert(suppressedRecommendationsTable).values({ tenantId: input.tenantId, playbookId: playbook.id, targetEntityId: mapped.email, reasonCode: suppression.reasonCode, reasonText: suppression.reasonText, evidenceSnapshot: evaluation.evidence, correlationId }).returning())[0];
          suppressed.push(row);
          continue;
        }

        const trust = assessTrust({
          mvp_mode: true,
          entity_input: { identity_confidence: 0.9, source_consistency: 0.85, data_freshness: 0.9, ownership_confidence: 0.8, source_reliability: 0.85 },
          recommendation_input: { usage_signal_quality: 0.8, entitlement_confidence: 0.85, policy_fit: 0.9, savings_confidence: mapped.cost > 0 ? 1 : 0.6 },
          execution_input: { action_reversibility: 0.8, approval_state: 0.9, blast_radius_score: 0.8, rollback_confidence: 0.8 },
          blocker_context: {},
        });
        const explainability = buildRecommendationExplainability({
          playbookId: playbook.id,
          playbookName: playbook.name,
          matched: Boolean(evaluation.matched),
          suppression: null,
          trustBand: input.trustBand,
          findingsBlock: input.findingsBlock,
          trust: {
            executionGate: trust.execution_gate,
            criticalBlockers: trust.critical_blockers,
            warnings: trust.warnings,
            entityTrustScore: trust.entity_trust_score,
            recommendationTrustScore: trust.recommendation_trust_score,
            executionReadinessScore: trust.execution_readiness_score,
            savingsConfidence: Number((mapped.cost > 0 ? 1 : 0.6)),
          },
          evidence: evaluation.evidence ?? {},
          trustGovernanceDecisions: [
            { stage: "EVIDENCE", decision: "ALLOW", reason: "PLAYBOOK_EVIDENCE_PRESENT" },
            { stage: "TRUST_SCORING", decision: trust.execution_gate, reason: trust.critical_blockers[0] ?? "TRUST_THRESHOLD_PASS" },
            { stage: "GOVERNANCE", decision: "RECOMMEND_ONLY", reason: "NO_EXECUTION_AUTHORITY" },
          ],
        });

        const rec = (await db.insert(recommendationsTable).values({
          userEmail: mapped.email, displayName: mapped.displayName ?? mapped.email, licenceSku: mapped.sku, monthlyCost: evaluation.estimatedMonthlySaving, annualisedCost: evaluation.estimatedMonthlySaving * 12,
          trustScore: trust.execution_readiness_score, entityTrustScore: trust.entity_trust_score, recommendationTrustScore: trust.recommendation_trust_score, executionReadinessScore: trust.execution_readiness_score, executionStatus: trust.execution_gate, criticalBlockers: trust.critical_blockers, warnings: trust.warnings, scoreBreakdown: trust.score_breakdown, status: "pending", playbook: playbook.vendor, playbookId: playbook.id, playbookName: playbook.name, playbookEvidence: evaluation.evidence, playbookRequiredSignals: evaluation.requiredSignals, playbookExclusions: evaluation.exclusions, evaluationEventId: String(event.id), connector: "m365", partialData: "false",
          actionType: Array.isArray(evaluation.recommendedAction)?evaluation.recommendedAction.join("+"):evaluation.recommendedAction, targetEntityId: mapped.email, targetEntityType: "USER", evidenceSummary: { ...evaluation.evidence, connectorTrustSnapshotId: input.connectorTrustSnapshotId, explainability }, trustRequirements: evaluation.trustRequirements ?? [], expectedMonthlySaving: evaluation.estimatedMonthlySaving, expectedAnnualSaving: evaluation.estimatedMonthlySaving*12, recommendationRiskClass: evaluation.riskClass ?? playbook.riskClass, recommendationExecutionMode: evaluation.executionMode ?? playbook.defaultExecutionMode, recommendationVerificationMethod: evaluation.verificationMethod ?? playbook.verificationMethod, rollbackNotes: evaluation.rollbackNotes ?? playbook.rollbackConsiderations, recommendationStatus: input.trustBand === "LOW" ? "NEEDS_TRUST_REVIEW" : "READY_FOR_ORCHESTRATION", correlationId,
        }).returning())[0];
        const envelope = buildExplainabilityEnvelope(rec as Record<string, unknown>);
        await this.rationaleService.persistSnapshot({
          tenantId: input.tenantId,
          recommendation: rec,
          explainability: envelope.explainability,
          evidenceLineage: envelope.evidenceLineage,
          connectorTrustSnapshotId: String(input.connectorTrustSnapshotId ?? ""),
          decisionTraces: [
            { stage: "EVIDENCE", stageOrder: 1, outcome: "ALLOW", reason: "PLAYBOOK_EVIDENCE_PRESENT", blocking: false, warning: false, sourceEvidenceIds: Object.keys(rec.playbookEvidence ?? {}).sort() },
            { stage: "TRUST", stageOrder: 2, outcome: trust.execution_gate, reason: trust.critical_blockers[0] ?? "TRUST_THRESHOLD_PASS", blocking: trust.execution_gate === "BLOCKED", warning: (trust.warnings?.length ?? 0) > 0, sourceEvidenceIds: [] },
            { stage: "GOVERNANCE", stageOrder: 3, outcome: "RECOMMEND_ONLY", reason: "NO_EXECUTION_AUTHORITY", blocking: false, warning: false, sourceEvidenceIds: [] },
          ],
        });
        recommendations.push(rec);
      }
    }
    return { recommendations, suppressed, evaluationEvents };
  }

  async listRecommendations(tenantId: string){ return db.select().from(recommendationsTable).where(eq(recommendationsTable.tenantId, tenantId)).orderBy(desc(recommendationsTable.createdAt)); }
  async getRecommendation(tenantId: string, id:number){ const [r] = await db.select().from(recommendationsTable).where(and(eq(recommendationsTable.id,id),eq(recommendationsTable.tenantId,tenantId))); return r; }
  async listSuppressed(tenantId: string){ return db.select().from(suppressedRecommendationsTable).where(eq(suppressedRecommendationsTable.tenantId, tenantId)).orderBy(desc(suppressedRecommendationsTable.createdAt)); }

  async createOrchestrationPlanFromRecommendation(tenantId:string, recommendationId:number, actorId="system"){
    const [rec]: any[] = await db.select().from(recommendationsTable).where(and(eq(recommendationsTable.id,recommendationId), eq(recommendationsTable.tenantId, tenantId))).limit(1);
    if (!rec) throw new Error("Recommendation not found");
    if (rec.recommendationStatus !== "READY_FOR_ORCHESTRATION") throw new Error("RECOMMENDATION_NOT_READY_FOR_ORCHESTRATION");
    const plan = await this.repo.createPlan({ tenantId, workflowId: `playbook-${rec.playbookId}`, sourceRecommendationIds: [rec.id], playbookId: rec.playbookId, planType: "PLAYBOOK_RECOMMENDATION", status: "DRAFT", riskClassMax: rec.recommendationRiskClass, blastRadiusScore: 0.2, blastRadiusBand: "LOW", automationEligibility: "RECOMMEND_ONLY", approvalRequired: rec.recommendationExecutionMode !== "AUTOMATED", createdByActorId: actorId, evidenceRef: rec.evaluationEventId, correlationId: rec.correlationId });
    const [queueItem] = await this.repo.enqueueQueueItems([{ tenantId, planId: plan.id, actionType: rec.actionType, targetEntityType: rec.targetEntityType, targetEntityId: rec.targetEntityId, status: "QUEUED", riskClass: rec.recommendationRiskClass, executionMode: rec.recommendationExecutionMode, expectedMonthlySaving: rec.expectedMonthlySaving, expectedAnnualSaving: rec.expectedAnnualSaving, verificationMethod: rec.recommendationVerificationMethod, rollbackNotes: rec.rollbackNotes, correlationId: rec.correlationId }]);
    const event = await this.repo.appendEvent({ tenantId, planId: plan.id, queueItemId: queueItem.id, eventType: "PLAYBOOK_RECOMMENDATION_PLAN_CREATED", source: "playbook-recommendations", actorId, correlationId: rec.correlationId, payload: { recommendationId: rec.id, playbookId: rec.playbookId, actionType: rec.actionType } });
    return { plan, queueItem, event };
  }
}
