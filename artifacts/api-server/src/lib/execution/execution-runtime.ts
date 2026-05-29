import { ExecutionRequestRepository } from "./execution-request-repository";
import { ExecutionDryRunRepository } from "./dry-run-repository";
import { GovernedRecommendationRepository } from "../recommendations/recommendation-repository";
import { RecommendationGovernanceEventService } from "../recommendations/governance-event-service";
import { appendUnifiedEvent } from "../events/evidence-timeline";
import { evaluateExecutionPolicy } from "./execution-policy-engine";
import { executeM365RemoveLicense } from "./executors/m365-remove-license-executor";
import { ExecutionResultRecorder } from "./execution-result-recorder";

function nowIso(){ return new Date().toISOString(); }
function arr(input: unknown): string[] { return Array.isArray(input) ? input.map(String) : []; }
function metadata(input: any): Record<string, unknown> { return (input && typeof input === "object" ? input.metadata : {}) ?? {}; }

export class ExecutionRuntime {
  constructor(
    private readonly requests = new ExecutionRequestRepository(),
    private readonly dryRuns = new ExecutionDryRunRepository(),
    private readonly recommendations = new GovernedRecommendationRepository(),
    private readonly governance = new RecommendationGovernanceEventService(),
    private readonly results = new ExecutionResultRecorder(),
  ) {}

  private async recordResult(tenantId: string, req: any, state: "BLOCKED"|"FAILED"|"EXECUTED", payload: { executedActions?: unknown[]; executionEvidence?: unknown[]; rollbackReference?: string; executionWarnings?: unknown[]; executionErrors?: unknown[]; startedAt: string; completedAt?: string; executedBy: string }) {
    const result = await this.results.create({
      executionResultId: `execres_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      executionRequestId: String(req.executionRequestId ?? req.requestId),
      executionState: state,
      executedActions: payload.executedActions ?? [],
      executionEvidence: payload.executionEvidence ?? [],
      rollbackReference: payload.rollbackReference ?? "none",
      executionWarnings: payload.executionWarnings ?? [],
      executionErrors: payload.executionErrors ?? [],
      startedAt: new Date(payload.startedAt),
      completedAt: new Date(payload.completedAt ?? nowIso()),
      executedBy: payload.executedBy,
    });
    const readinessState = state === "EXECUTED" ? "READY_FOR_EXECUTION" : "EXECUTION_BLOCKED";
    await this.requests.updateState(tenantId, String(req.executionRequestId ?? req.requestId), state === "EXECUTED" ? "EXECUTED" : state);
    await this.requests.updateExecutionRequest(tenantId, String(req.executionRequestId ?? req.requestId), { readinessState: readinessState as any, metadata: { ...metadata(req), latestExecutionResultId: result.executionResultId, latestExecutionResultState: state, executionWarnings: payload.executionWarnings ?? [], executionErrors: payload.executionErrors ?? [], executedAt: result.completedAt instanceof Date ? result.completedAt.toISOString() : String(result.completedAt) } });
    return result;
  }

  async execute(tenantId: string, executionRequestId: string, executedBy: string) {
    const existing = await this.results.getByRequestId(tenantId, executionRequestId);
    if (existing) return existing;

    const req = await this.requests.getByExecutionRequestId(tenantId, executionRequestId);
    if (!req) return null;
    const v1 = await this.requests.getExecutionRequest(tenantId, executionRequestId);
    const dryRun = await this.dryRuns.latest(tenantId, executionRequestId);
    const rec = await this.recommendations.getByRecommendationId(tenantId, String(req.recommendationId));
    const events = await this.governance.list(tenantId, String(req.recommendationId));
    const hasApproval = events.some((e) => e.eventType === "RECOMMENDATION_APPROVED" || e.eventType === "APPROVAL_WORKFLOW_CREATED" || e.eventType === "APPROVAL_STAGE_ENTERED");
    const approvalStale = false;
    const governanceChainComplete = hasApproval || !!req.approvalWorkflowId;

    const preconditionBlocks: string[] = [];
    if (String(v1?.readinessState ?? req.readinessState ?? req.executionState) !== "READY_FOR_EXECUTION" && String(req.executionState) !== "APPROVED_FOR_EXECUTION") preconditionBlocks.push("REQUEST_NOT_READY_FOR_EXECUTION");
    if (!dryRun || String(dryRun.simulationState) !== "READY_FOR_EXECUTION") preconditionBlocks.push("DRY_RUN_NOT_READY");
    if (!rec) preconditionBlocks.push("RECOMMENDATION_NOT_FOUND");
    if (rec && ["BLOCKED", "NEVER_ELIGIBLE"].includes(String(rec.recommendationState))) preconditionBlocks.push("RECOMMENDATION_BLOCKED");
    if (rec?.executionRequestId && rec.executionRequestId !== executionRequestId) preconditionBlocks.push("EXECUTION_REQUEST_LINK_MISMATCH");
    if (!rec || String(rec.discoveryLifecycleState) !== "TRUSTED") preconditionBlocks.push("LIFECYCLE_NOT_TRUSTED");
    if (new Date(req.expiresAt).getTime() <= Date.now()) preconditionBlocks.push("REQUEST_EXPIRED");
    if (String(req.executionState) === "CANCELLED") preconditionBlocks.push("REQUEST_CANCELLED");
    if (!governanceChainComplete) preconditionBlocks.push("MISSING_APPROVAL_EVENT");
    if (!req.rollbackPlan || Object.keys(req.rollbackPlan as object).length === 0) preconditionBlocks.push("MISSING_ROLLBACK_PLAN");

    const policy = evaluateExecutionPolicy({
      actionType: String(req.actionType),
      actionRiskClass: String(req.actionRiskClass),
      rollbackSupported: !!dryRun?.rollbackSupported,
      lifecycleState: String(rec?.discoveryLifecycleState ?? "UNKNOWN"),
      connectorHealth: "HEALTHY",
      approvalStale,
      governanceChainComplete,
      executionMode: String(req.executionMode),
    });

    const startedAt = nowIso();
    appendUnifiedEvent({ eventId: `${executionRequestId}:EXECUTION_STARTED:${startedAt}`, tenantId, entityType: "EXECUTION_REQUEST", entityId: executionRequestId, eventType: "EXECUTION_STARTED", eventCategory: "EXECUTION", actorId: executedBy, actorRole: "OPERATOR", eventReason: "Operator started governed execution", beforeState: String(v1?.readinessState ?? req.executionState), afterState: "EXECUTING", evidenceSnapshot: arr(rec?.evidencePointers), sourceSystem: "execution-runtime", createdAt: startedAt });

    if (preconditionBlocks.length || !policy.allowed) {
      const errors = [...preconditionBlocks, ...policy.blocks];
      await this.governance.emit({ tenantId, recommendationId: String(req.recommendationId), eventType: "EXECUTION_BLOCKED", actorId: executedBy, actorRole: "OPERATOR", eventReason: errors.join(",") });
      const result = await this.recordResult(tenantId, req, "BLOCKED", { executedActions: [], executionEvidence: [], rollbackReference: String((dryRun?.rollbackPlan as any)?.type ?? "none"), executionWarnings: [], executionErrors: errors, startedAt, executedBy });
      appendUnifiedEvent({ eventId: `${executionRequestId}:EXECUTION_BLOCKED:${startedAt}`, tenantId, entityType: "EXECUTION_REQUEST", entityId: executionRequestId, eventType: "EXECUTION_BLOCKED", eventCategory: "EXECUTION", actorId: executedBy, actorRole: "OPERATOR", eventReason: errors.join(","), beforeState: String(v1?.readinessState ?? req.executionState), afterState: "BLOCKED", evidenceSnapshot: arr(rec?.evidencePointers), sourceSystem: "execution-runtime", createdAt: nowIso() });
      return result;
    }

    await this.governance.emit({ tenantId, recommendationId: String(req.recommendationId), eventType: "EXECUTION_STARTED", actorId: executedBy, actorRole: "OPERATOR" });

    const rollbackReference = `rb_${executionRequestId}`;
    const targetEntityId = String(req.targetEntityId ?? metadata(req).targetEntityId ?? req.recommendationId);
    const run = await executeM365RemoveLicense({ targetEntityId, rollbackReference, timeoutMs: 5_000 });
    if (!run.ok) {
      await this.governance.emit({ tenantId, recommendationId: String(req.recommendationId), eventType: "EXECUTION_FAILED", actorId: executedBy, actorRole: "OPERATOR", eventReason: run.errors.join(",") });
      const result = await this.recordResult(tenantId, req, "FAILED", { executedActions: [], executionEvidence: run.evidence, rollbackReference, executionWarnings: run.warnings ?? [], executionErrors: run.errors ?? [], startedAt, executedBy });
      appendUnifiedEvent({ eventId: `${executionRequestId}:EXECUTION_FAILED:${startedAt}`, tenantId, entityType: "EXECUTION_REQUEST", entityId: executionRequestId, eventType: "EXECUTION_FAILED", eventCategory: "EXECUTION", actorId: executedBy, actorRole: "OPERATOR", eventReason: run.errors.join(","), beforeState: "EXECUTING", afterState: "FAILED", evidenceSnapshot: run.evidence, sourceSystem: "execution-runtime", createdAt: nowIso() });
      return result;
    }

    await this.governance.emit({ tenantId, recommendationId: String(req.recommendationId), eventType: "EXECUTION_COMPLETED", actorId: executedBy, actorRole: "OPERATOR" });
    const result = await this.recordResult(tenantId, req, "EXECUTED", { executedActions: run.actions, executionEvidence: run.evidence, rollbackReference, executionWarnings: run.warnings, executionErrors: run.errors, startedAt, executedBy });
    appendUnifiedEvent({ eventId: `${executionRequestId}:EXECUTION_COMPLETED:${startedAt}`, tenantId, entityType: "EXECUTION_REQUEST", entityId: executionRequestId, eventType: "EXECUTION_COMPLETED", eventCategory: "EXECUTION", actorId: executedBy, actorRole: "OPERATOR", eventReason: "Governed execution completed", beforeState: "EXECUTING", afterState: "EXECUTED", evidenceSnapshot: run.evidence, sourceSystem: "execution-runtime", createdAt: nowIso() });
    return result;
  }

  async getResult(tenantId: string, executionRequestId: string) { return this.results.getByRequestId(tenantId, executionRequestId); }
}
