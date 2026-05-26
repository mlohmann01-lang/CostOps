import { ExecutionRequestRepository } from "./execution-request-repository";
import { ExecutionDryRunRepository } from "./dry-run-repository";
import { GovernedRecommendationRepository } from "../recommendations/recommendation-repository";
import { RecommendationGovernanceEventService } from "../recommendations/governance-event-service";
import { evaluateExecutionPolicy } from "./execution-policy-engine";
import { executeM365RemoveLicense } from "./executors/m365-remove-license-executor";
import { ExecutionResultRecorder } from "./execution-result-recorder";

function nowIso(){ return new Date().toISOString(); }

export class ExecutionRuntime {
  constructor(
    private readonly requests = new ExecutionRequestRepository(),
    private readonly dryRuns = new ExecutionDryRunRepository(),
    private readonly recommendations = new GovernedRecommendationRepository(),
    private readonly governance = new RecommendationGovernanceEventService(),
    private readonly results = new ExecutionResultRecorder(),
  ) {}

  async execute(tenantId: string, executionRequestId: string, executedBy: string) {
    const existing = await this.results.getByRequestId(tenantId, executionRequestId);
    if (existing) return existing;

    const req = await this.requests.getByExecutionRequestId(tenantId, executionRequestId);
    if (!req) return null;
    const dryRun = await this.dryRuns.latest(tenantId, executionRequestId);
    const rec = await this.recommendations.getByRecommendationId(tenantId, String(req.recommendationId));
    const events = await this.governance.list(tenantId, String(req.recommendationId));
    const hasApproval = events.some((e) => e.eventType === "RECOMMENDATION_APPROVED");
    const approvalStale = false;
    const governanceChainComplete = hasApproval;

    const preconditionBlocks: string[] = [];
    if (String(req.executionState) !== "APPROVED_FOR_EXECUTION") preconditionBlocks.push("REQUEST_NOT_APPROVED_FOR_EXECUTION");
    if (!dryRun || String(dryRun.simulationState) !== "READY_FOR_EXECUTION") preconditionBlocks.push("DRY_RUN_NOT_READY");
    if (!rec || String(rec.recommendationState) !== "EXECUTION_READY") preconditionBlocks.push("RECOMMENDATION_NOT_EXECUTION_READY");
    if (!rec || String(rec.discoveryLifecycleState) !== "TRUSTED") preconditionBlocks.push("LIFECYCLE_NOT_TRUSTED");
    if (new Date(req.expiresAt).getTime() <= Date.now()) preconditionBlocks.push("REQUEST_EXPIRED");
    if (String(req.executionState) === "CANCELLED") preconditionBlocks.push("REQUEST_CANCELLED");
    if (!hasApproval) preconditionBlocks.push("MISSING_APPROVAL_EVENT");
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
    if (preconditionBlocks.length || !policy.allowed) {
      await this.governance.emit({ tenantId, recommendationId: String(req.recommendationId), eventType: "EXECUTION_BLOCKED", actorId: executedBy, actorRole: "OPERATOR", eventReason: [...preconditionBlocks, ...policy.blocks].join(",") });
      return this.results.create({
        executionResultId: `execres_${Date.now()}`,
        tenantId,
        executionRequestId,
        executionState: "BLOCKED",
        executedActions: [],
        executionEvidence: [],
        rollbackReference: String((dryRun?.rollbackPlan as any)?.type ?? "none"),
        executionWarnings: [],
        executionErrors: [...preconditionBlocks, ...policy.blocks],
        startedAt: new Date(startedAt),
        completedAt: new Date(),
        executedBy,
      });
    }

    await this.governance.emit({ tenantId, recommendationId: String(req.recommendationId), eventType: "EXECUTION_STARTED", actorId: executedBy, actorRole: "OPERATOR" });

    const rollbackReference = `rb_${executionRequestId}`;
    const run = await executeM365RemoveLicense({ targetEntityId: String(req.targetEntityId), rollbackReference, timeoutMs: 5_000 });
    if (!run.ok) {
      await this.governance.emit({ tenantId, recommendationId: String(req.recommendationId), eventType: "EXECUTION_FAILED", actorId: executedBy, actorRole: "OPERATOR", eventReason: run.errors.join(",") });
      return this.results.create({ executionResultId: `execres_${Date.now()}`, tenantId, executionRequestId, executionState: "FAILED", executedActions: [], executionEvidence: run.evidence, rollbackReference, executionWarnings: run.warnings ?? [], executionErrors: run.errors ?? [], startedAt: new Date(startedAt), completedAt: new Date(), executedBy });
    }

    await this.governance.emit({ tenantId, recommendationId: String(req.recommendationId), eventType: "EXECUTION_COMPLETED", actorId: executedBy, actorRole: "OPERATOR" });
    return this.results.create({ executionResultId: `execres_${Date.now()}`, tenantId, executionRequestId, executionState: "EXECUTED", executedActions: run.actions, executionEvidence: run.evidence, rollbackReference, executionWarnings: run.warnings, executionErrors: run.errors, startedAt: new Date(startedAt), completedAt: new Date(), executedBy });
  }

  async getResult(tenantId: string, executionRequestId: string) { return this.results.getByRequestId(tenantId, executionRequestId); }
}
