import { db, playbookEvaluationEventsTable, recommendationsTable, suppressedRecommendationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { PLAYBOOK_REGISTRY } from "./registry";
import { ExecutionOrchestrationRepository } from "../execution-orchestration/execution-orchestration.repository";
import { assessTrust } from "../trust-engine";
import { buildRecommendationExplainability } from "../recommendations/recommendation-explainability";
import { buildExplainabilityEnvelope } from "../recommendations/explainability-surface";
import { RecommendationRationalePersistenceService, deterministicHash } from "../recommendations/recommendation-rationale-persistence-service";
import { emitM365Event } from "../observability/operational-telemetry-service";
import { recommendationDecisionTracesTable, recommendationOutcomesTable, policySimulationsTable, workflowItemsTable } from "@workspace/db";

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
        else if (!suppression && mapped.copilotUsage === "UNKNOWN" && playbook.id.includes("COPILOT")) suppression = { reasonCode: "M365_COPILOT_USAGE_UNAVAILABLE", reasonText: "Copilot usage unavailable" };
        else if (!suppression && mapped.legalHold === "UNKNOWN" && playbook.id.includes("STORAGE")) suppression = { reasonCode: "M365_RETENTION_POLICY_UNKNOWN", reasonText: "Legal hold unknown" };
        else if (!suppression && (mapped.isAdmin === true || mapped.isPrivileged === true)) suppression = { reasonCode: "M365_PRIVILEGED_ACCOUNT_EXCLUSION", reasonText: "Privileged user requires governance review" };

        if (suppression) {
          const row = (await db.insert(suppressedRecommendationsTable).values({ tenantId: input.tenantId, playbookId: playbook.id, targetEntityId: mapped.email, reasonCode: suppression.reasonCode, reasonText: suppression.reasonText, evidenceSnapshot: evaluation.evidence, correlationId }).returning())[0];
          suppressed.push(row);
          await emitM365Event("M365_RECOMMENDATION_SUPPRESSED", { tenantId: input.tenantId, playbookId: playbook.id, entityId: mapped.email, correlationId, lifecycleState: "SUPPRESSED", trustBand: input.trustBand, severity: "MEDIUM" });
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
          actionType: Array.isArray(evaluation.recommendedAction)?evaluation.recommendedAction.join("+"):evaluation.recommendedAction, targetEntityId: mapped.email, targetEntityType: "USER", evidenceSummary: { ...evaluation.evidence, connectorTrustSnapshotId: input.connectorTrustSnapshotId, explainability }, trustRequirements: evaluation.trustRequirements ?? [], expectedMonthlySaving: evaluation.estimatedMonthlySaving, expectedAnnualSaving: evaluation.estimatedMonthlySaving*12, recommendationRiskClass: evaluation.riskClass ?? playbook.riskClass, recommendationExecutionMode: evaluation.executionMode ?? playbook.defaultExecutionMode, recommendationVerificationMethod: evaluation.verificationMethod ?? playbook.verificationMethod, rollbackNotes: evaluation.rollbackNotes ?? playbook.rollbackConsiderations, recommendationStatus: input.trustBand === "QUARANTINED" ? "SUPPRESSED_BY_CONNECTOR_TRUST" : input.trustBand === "LOW" ? "NEEDS_TRUST_REVIEW" : input.trustBand === "MEDIUM" ? "GOVERNANCE_REVIEW_REQUIRED" : "READY_FOR_REVIEW", correlationId,
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
        await this.persistLifecycleTransition({ tenantId: input.tenantId, recommendationId: String(rec.id), priorState: "GENERATED", nextState: String(rec.recommendationStatus ?? "READY_FOR_REVIEW"), transitionReason: "PLAYBOOK_GENERATION", trustBand: input.trustBand, governanceOutcome: trust.execution_gate, correlationId });
        await emitM365Event("M365_RECOMMENDATION_GENERATED", { tenantId: input.tenantId, recommendationId: String(rec.id), playbookId: playbook.id, entityId: mapped.email, correlationId, trustBand: input.trustBand, lifecycleState: String(rec.recommendationStatus ?? "READY_FOR_REVIEW"), governanceOutcome: trust.execution_gate, severity: "LOW" });
        recommendations.push(rec);
      }
    }
    return { recommendations, suppressed, evaluationEvents };
  }


  private async persistLifecycleTransition(input: { tenantId: string; recommendationId: string; priorState: string; nextState: string; transitionReason: string; trustBand?: string; governanceOutcome?: string; workflowId?: string; simulationId?: string; correlationId?: string; blockingFindings?: string[] }) {
    const tracePayload = { ...input, timestamp: new Date().toISOString() };
    const traceHash = deterministicHash(tracePayload);
    await db.insert(recommendationDecisionTracesTable).values({
      tenantId: input.tenantId,
      recommendationId: input.recommendationId,
      recommendationRationaleId: '0',
      stage: 'LIFECYCLE',
      stageOrder: '900',
      outcome: input.nextState,
      reason: JSON.stringify({ priorState: input.priorState, transitionReason: input.transitionReason, governanceOutcome: input.governanceOutcome ?? null, trustBand: input.trustBand ?? null, workflowId: input.workflowId ?? null, simulationId: input.simulationId ?? null, correlationId: input.correlationId ?? null, blockingFindings: input.blockingFindings ?? [], traceHash }),
      blocking: input.nextState === 'SUPPRESSED',
      warning: false,
      sourceEvidenceIds: [],
      traceHash,
    } as any);
    await emitM365Event('M365_LIFECYCLE_STATE_DERIVED', { tenantId: input.tenantId, recommendationId: input.recommendationId, correlationId: input.correlationId, lifecycleState: input.nextState, trustBand: input.trustBand, governanceOutcome: input.governanceOutcome });
  }

  async getLifecycleTrace(tenantId: string, recommendationId: string) {
    return db.select().from(recommendationDecisionTracesTable).where(and(eq(recommendationDecisionTracesTable.tenantId, tenantId), eq(recommendationDecisionTracesTable.recommendationId, recommendationId), eq(recommendationDecisionTracesTable.stage, 'LIFECYCLE'))).orderBy(desc(recommendationDecisionTracesTable.id));
  }

  async getReplayReport(tenantId: string, recommendationId: string) {
    const [rec] = await db.select().from(recommendationsTable).where(and(eq(recommendationsTable.tenantId, tenantId), eq(recommendationsTable.id, Number(recommendationId)))).limit(1);
    if (!rec) return null;
    const traces = await this.getLifecycleTrace(tenantId, recommendationId);
    const outcomes = await db.select().from(recommendationOutcomesTable).where(and(eq(recommendationOutcomesTable.tenantId, tenantId), eq(recommendationOutcomesTable.recommendationId, recommendationId))).orderBy(desc(recommendationOutcomesTable.resolvedAt));
    const workflows = await db.select().from(workflowItemsTable).where(and(eq(workflowItemsTable.tenantId, tenantId), eq(workflowItemsTable.targetId, String(rec.targetEntityId ?? rec.userEmail ?? ''))));
    const sims = await db.select().from(policySimulationsTable).where(eq(policySimulationsTable.tenantId, tenantId)).orderBy(desc(policySimulationsTable.createdAt)).limit(50);
    const missingTransitions = traces.length ? [] : ['LIFECYCLE'];
    const missingTelemetry: string[] = [];
    const hashMismatch = traces.some((t:any)=> !String(t.reason ?? '').includes(String(t.traceHash ?? '')));
    const workflowMismatch = workflows.length === 0 && rec.recommendationStatus === 'WORKFLOW_REVIEW';
    const outcomeMismatch = outcomes.length === 0 && rec.recommendationStatus === 'OUTCOME_RESOLVED';
    const simulationMismatch = sims.length === 0 && rec.recommendationStatus === 'SIMULATED';
    let replayIntegrity = 'VALID';
    if (missingTransitions.length) replayIntegrity = 'PARTIAL';
    if (hashMismatch || workflowMismatch || outcomeMismatch || simulationMismatch) replayIntegrity = 'MISMATCH';
    if (!traces.length && !outcomes.length && !workflows.length) replayIntegrity = 'INCOMPLETE';
    await emitM365Event(replayIntegrity === 'VALID' ? 'M365_REPLAY_VALIDATED' : 'M365_REPLAY_MISMATCH', { tenantId, recommendationId, lifecycleState: rec.recommendationStatus ?? undefined, correlationId: rec.correlationId ?? undefined, severity: replayIntegrity === 'VALID' ? 'LOW' : 'HIGH' });
    return { replayIntegrity, missingTransitions, missingTelemetry, hashMismatch, workflowMismatch, simulationMismatch, outcomeMismatch, continuityViolations: traces.filter((t:any)=>t.blocking).map((t:any)=>t.outcome) };
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
