import { db, playbookEvaluationEventsTable, recommendationsTable, suppressedRecommendationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { PLAYBOOK_REGISTRY } from "./registry";
import { ExecutionOrchestrationRepository } from "../execution-orchestration/execution-orchestration.repository";

export type M365EvidenceRecord = Record<string, any>;

export class PlaybookRecommendationService {
  private repo = new ExecutionOrchestrationRepository();

  async generateRecommendationsForTenant(input: { tenantId: string; source: "DEMO"|"M365_SYNC"|"MANUAL_IMPORT"; evidenceRecords: M365EvidenceRecord[]; actorId?: string; }) {
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

        if (suppression) {
          const row = (await db.insert(suppressedRecommendationsTable).values({ tenantId: input.tenantId, playbookId: playbook.id, targetEntityId: mapped.email, reasonCode: suppression.reasonCode, reasonText: suppression.reasonText, evidenceSnapshot: evaluation.evidence, correlationId }).returning())[0];
          suppressed.push(row);
          continue;
        }

        const rec = (await db.insert(recommendationsTable).values({
          userEmail: mapped.email, displayName: mapped.displayName ?? mapped.email, licenceSku: mapped.sku, monthlyCost: evaluation.estimatedMonthlySaving, annualisedCost: evaluation.estimatedMonthlySaving * 12,
          trustScore: 0.8, entityTrustScore: 0.85, recommendationTrustScore: 0.8, executionReadinessScore: 0.8, executionStatus: "APPROVAL_REQUIRED", criticalBlockers: [], warnings: [], scoreBreakdown: {}, status: "pending", playbook: playbook.vendor, playbookId: playbook.id, playbookName: playbook.name, playbookEvidence: evaluation.evidence, playbookRequiredSignals: evaluation.requiredSignals, playbookExclusions: evaluation.exclusions, evaluationEventId: String(event.id), connector: "m365", partialData: "false",
          actionType: Array.isArray(evaluation.recommendedAction)?evaluation.recommendedAction.join("+"):evaluation.recommendedAction, targetEntityId: mapped.email, targetEntityType: "USER", evidenceSummary: evaluation.evidence, trustRequirements: evaluation.trustRequirements ?? [], expectedMonthlySaving: evaluation.estimatedMonthlySaving, expectedAnnualSaving: evaluation.estimatedMonthlySaving*12, recommendationRiskClass: evaluation.riskClass ?? playbook.riskClass, recommendationExecutionMode: evaluation.executionMode ?? playbook.defaultExecutionMode, recommendationVerificationMethod: evaluation.verificationMethod ?? playbook.verificationMethod, rollbackNotes: evaluation.rollbackNotes ?? playbook.rollbackConsiderations, recommendationStatus: "READY_FOR_ORCHESTRATION", correlationId,
        }).returning())[0];
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
