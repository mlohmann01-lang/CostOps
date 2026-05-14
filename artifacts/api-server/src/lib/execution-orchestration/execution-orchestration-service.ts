import { runExecutionEngine } from "../execution/execution-engine";
import { evaluateExecutionRuntimeControls } from "../security/runtime-controls";
import { transitionOrchestrationState } from "./execution-orchestration-state-machine";
import { ExecutionOrchestrationRepository } from "./execution-orchestration.repository";

const BATCH_DEFAULTS = { maxItemsPerBatch:25, maxAffectedEntities:25, maxRiskClass:"B", maxBlastRadiusScore:74, cooldownMinutes:30, sampleBatchSize:5, maxFailureRatePercent:10 };
const AUTO_DEFAULTS = { minSuccessfulRuns:10, minVerifiedSampleBatches:2, maxFailureRatePercent:5, criticalEscalationsAllowed:0, autoSafeAllowedRiskClass:"A", autoSafeAllowedBlastRadius:"LOW", rollbackRequired:true };

export class ExecutionOrchestrationTelemetryService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository()) {}
  async emit(event: any) {
    try { return await this.repo.appendEvent(event); }
    catch (error) { console.error("execution_orchestration_event_persist_failed", { event, error }); throw error; }
  }
  async emitFailSafe(event: any) { try { return await this.emit(event); } catch (error) { return { failedToPersist: true, event, error: String(error) }; } }
}

export class ExecutionEscalationService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository(), private readonly telemetry = new ExecutionOrchestrationTelemetryService(repo)) {}
  createEscalation(input: any) { return this.repo.createEscalation(input); }
  acknowledgeEscalation(tenantId: string, id: number, actorId?: string) { return this.repo.acknowledgeEscalation(tenantId, id, actorId); }
  resolveEscalation(tenantId: string, id: number, resolutionNotes?: string) { return this.repo.resolveEscalation(tenantId, id, resolutionNotes); }
  listOpenEscalations(tenantId: string, planId?: number) { return this.repo.listOpenEscalations(tenantId, planId); }
  async escalateQueueItem(input: any) {
    const e = await this.createEscalation(input);
    await this.repo.updateItem(input.tenantId, input.queueItemId, { status: "ESCALATED" });
    await this.telemetry.emitFailSafe({ tenantId: input.tenantId, planId: input.planId, queueItemId: input.queueItemId, eventType: "QUEUE_ITEM_ESCALATED", source: "execution-orchestration", correlationId: input.correlationId, payload: input });
    return e;
  }
  async escalatePlan(input: any) {
    const e = await this.createEscalation(input);
    await this.repo.updatePlan(input.tenantId, input.planId, { status: "ESCALATED" });
    return e;
  }
}

export class ExecutionDependencyService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository(), private readonly escalation = new ExecutionEscalationService(repo)) {}
  createDependency(input: any) { return this.repo.createDependency(input); }
  listDependenciesForItem(tenantId: string, queueItemId: number) { return this.repo.listDependenciesForItem(tenantId, queueItemId); }
  resolveDependency(tenantId: string, id: number) { return this.repo.resolveDependency(tenantId, id); }
  async failDependency(tenantId: string, id: number, reason: string) {
    const dep = await this.repo.failDependency(tenantId, id, reason);
    if (dep?.dependencyType === "MUST_SUCCEED") {
      await this.escalation.escalateQueueItem({ tenantId, planId: dep.planId, queueItemId: dep.queueItemId, escalationType: "DEPENDENCY_FAILED", severity: "HIGH", reason, correlationId: `dep-fail:${dep.id}` });
    }
    return dep;
  }
  getBlockedItemsReadyForRecheck(tenantId: string) { return this.repo.getBlockedItemsReadyForRecheck(tenantId); }
  async evaluateItemDependencyReadiness(tenantId: string, queueItemId: number) {
    const deps = await this.listDependenciesForItem(tenantId, queueItemId);
    const unresolved = deps.some((d: any) => d.status === "PENDING");
    const failed = deps.some((d: any) => d.status === "FAILED" && d.dependencyType === "MUST_SUCCEED");
    if (failed) {
      await this.repo.updateItem(tenantId, queueItemId, { status: "ESCALATED", failureReason: "DEPENDENCY_FAILED" });
      return { ready: false, escalated: true };
    }
    if (unresolved) {
      await this.repo.updateItem(tenantId, queueItemId, { status: "WAITING_DEPENDENCIES" });
      return { ready: false };
    }
    await this.repo.updateItem(tenantId, queueItemId, { status: "READY" });
    return { ready: true };
  }
}

export class ExecutionSlaService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository(), private readonly escalation = new ExecutionEscalationService(repo), private readonly telemetry = new ExecutionOrchestrationTelemetryService(repo)) {}
  evaluatePlanSla(plan: any) { return this.evaluateAge(plan.createdAt); }
  evaluateQueueItemSla(item: any) { return this.evaluateAge(item.createdAt); }
  evaluateAge(createdAt: Date) { const age = Date.now() - new Date(createdAt).getTime(); if (age > 30 * 60_000) return "BREACHED"; if (age > 20 * 60_000) return "APPROACHING_BREACH"; return "WITHIN_SLA"; }
  markSlaWarning(tenantId: string, queueItemId: number) { return this.repo.updateItem(tenantId, queueItemId, { failureReason: "SLA_WARNING" }); }
  async markSlaBreached(item: any) {
    await this.escalation.escalateQueueItem({ tenantId: item.tenantId, planId: item.planId, queueItemId: item.id, escalationType: "SLA_BREACH", severity: "MEDIUM", reason: "SLA breached", correlationId: item.correlationId });
    await this.telemetry.emitFailSafe({ tenantId: item.tenantId, planId: item.planId, queueItemId: item.id, eventType: "SLA_BREACHED", source: "execution-orchestration", correlationId: item.correlationId, payload: { status: item.status } });
  }
  async checkSlaBreaches(tenantId: string) {
    const items = await this.repo.listActiveQueueItems(tenantId);
    for (const item of items) {
      const state = this.evaluateQueueItemSla(item);
      if (state === "APPROACHING_BREACH") await this.markSlaWarning(tenantId, item.id);
      if (state === "BREACHED") await this.markSlaBreached(item);
    }
    return { scanned: items.length };
  }
}

export class ExecutionBatchService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository(), private readonly telemetry = new ExecutionOrchestrationTelemetryService(repo), private readonly escalation = new ExecutionEscalationService(repo)) {}
  async createBatch(input: any) { const b = await this.repo.createBatch({ ...input, status: input.status ?? "DRAFT" }); await this.telemetry.emitFailSafe({ tenantId: b.tenantId, planId: b.planId, eventType: "BATCH_CREATED", source:"execution-orchestration", correlationId: input.correlationId ?? `batch:${b.id}`, payload: b }); return b; }
  async assignItemsToBatch(batchId:number, items: any[], constraints=BATCH_DEFAULTS) { return this.repo.assignBatchItems(items.slice(0, constraints.maxItemsPerBatch).map((i:any)=>({tenantId:i.tenantId,batchId,queueItemId:i.id}))); }
  getBatch(tenantId:string,id:number){ return this.repo.getBatch(tenantId,id); }
  listBatches(tenantId:string){ return this.repo.listBatches(tenantId); }
  async evaluateBatchReadiness(tenantId:string,batchId:number,constraints=BATCH_DEFAULTS){ const batch=await this.repo.getBatch(tenantId,batchId); const links=await this.repo.getBatchItems(tenantId,batchId); const items=await Promise.all(links.map((l:any)=>this.repo.updateItem(tenantId,l.queueItemId,{})));
    const blocked=items.some((i:any)=>["BLOCKED","QUARANTINED","CANCELLED"].includes(i?.status)); if(blocked) return this.repo.updateBatch(tenantId,batchId,{status:"BLOCKED"});
    if(items.some((i:any)=>i?.status==="WAITING_DEPENDENCIES")) return this.repo.updateBatch(tenantId,batchId,{status:"WAITING_DEPENDENCIES"});
    if(items.some((i:any)=>i?.approvalStatus && i.approvalStatus!=="APPROVED" && i.approvalStatus!=="NOT_REQUIRED")) return this.repo.updateBatch(tenantId,batchId,{status:"WAITING_APPROVAL"});
    if(items.length>constraints.maxItemsPerBatch) return this.repo.updateBatch(tenantId,batchId,{status:"BLOCKED",readiness:"MAX_ITEMS_EXCEEDED"});
    if((batch?.cooldownUntil && new Date(batch.cooldownUntil).getTime()>Date.now())) return this.repo.updateBatch(tenantId,batchId,{status:"PAUSED",readiness:"COOLDOWN"});
    const requiresSample = items.some((i:any)=>i?.riskClass==="B"||i?.blastRadiusBand==="HIGH") && !batch?.isSampleBatch;
    if(requiresSample && (!batch?.sampleBatchStatus || batch?.sampleBatchStatus!=="COMPLETED" || !batch?.sampleOutcomeVerified)) return this.repo.updateBatch(tenantId,batchId,{status:"WAITING_DEPENDENCIES",readiness:"SAMPLE_REQUIRED"});
    const ready=await this.repo.updateBatch(tenantId,batchId,{status:"READY",lastEvaluatedAt:new Date()});
    await this.telemetry.emitFailSafe({tenantId,planId:batch?.planId,eventType:"BATCH_READY",source:"execution-orchestration",correlationId:`batch:${batchId}`,payload:{batchId}}); return ready;
  }
  markBatchRunning(tenantId:string,id:number){ return this.repo.updateBatch(tenantId,id,{status:"RUNNING",startedAt:new Date()}); }
  markBatchPartial(tenantId:string,id:number){ return this.repo.updateBatch(tenantId,id,{status:"PARTIAL"}); }
  markBatchCompleted(tenantId:string,id:number){ return this.repo.updateBatch(tenantId,id,{status:"COMPLETED",completedAt:new Date()}); }
  markBatchFailed(tenantId:string,id:number){ return this.repo.updateBatch(tenantId,id,{status:"FAILED",completedAt:new Date()}); }
  pauseBatch(tenantId:string,id:number){ return this.repo.updateBatch(tenantId,id,{status:"PAUSED",cooldownUntil:new Date(Date.now()+BATCH_DEFAULTS.cooldownMinutes*60_000)}); }
  cancelBatch(tenantId:string,id:number){ return this.repo.updateBatch(tenantId,id,{status:"CANCELLED",completedAt:new Date()}); }
  async evaluateBatchFailurePolicy(batch:any, failures:number,total:number){ const rate = total ? (failures/total)*100 : 0; if (rate > BATCH_DEFAULTS.maxFailureRatePercent) { await this.pauseBatch(batch.tenantId,batch.id); await this.escalation.escalatePlan({ tenantId: batch.tenantId, planId: batch.planId, escalationType:"BATCH_FAILURE_THRESHOLD", severity:"HIGH", reason:`Failure rate ${rate.toFixed(2)} exceeded threshold`, correlationId:`batch:${batch.id}` }); return { paused:true, rate }; } return { paused:false, rate }; }
}

export class ExecutionAutomationPromotionService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository(), private readonly telemetry = new ExecutionOrchestrationTelemetryService(repo)) {}
  buildEvidence(candidate:any, decision:string, reasons:string[], recommendedMode:string, promotionStatus:string, cfg=AUTO_DEFAULTS){
    return { tenantId: candidate.tenantId, candidateId: candidate.id, actionType: candidate.actionType, currentMode: candidate.currentMode, recommendedMode, promotionStatus,
      criteria: { successfulRuns: candidate.successfulRuns ?? 0, failedRuns: candidate.failedRuns ?? 0, verifiedSampleBatches: candidate.verifiedSampleBatches ?? 0, failureRatePercent: candidate.failureRatePercent ?? 0, minSuccessfulRuns: cfg.minSuccessfulRuns, minVerifiedSampleBatches: cfg.minVerifiedSampleBatches, maxFailureRatePercent: cfg.maxFailureRatePercent, rollbackRequired: cfg.rollbackRequired, rollbackAvailable: candidate.rollbackAvailable ?? false, riskClass: candidate.riskClass, allowedRiskClass: cfg.autoSafeAllowedRiskClass, blastRadiusBand: candidate.blastRadiusBand, allowedBlastRadius: cfg.autoSafeAllowedBlastRadius, runtimeBlockHistory: Boolean(candidate.lastRuntimeBlockAt), criticalEscalationHistory: Boolean(candidate.lastCriticalEscalationAt) },
      decision, reasons, evaluatedAt: new Date().toISOString() };
  }
  evaluatePromotion(candidate:any, cfg=AUTO_DEFAULTS){ const reasons:string[]=[]; let decision="NO_CHANGE"; let recommendedMode=candidate.currentMode; let promotionStatus="NOT_ELIGIBLE";
    if(candidate.lastCriticalEscalationAt){ reasons.push("CRITICAL_ESCALATION_HISTORY"); decision="NOT_ELIGIBLE"; }
    else if(candidate.lastRuntimeBlockAt){ reasons.push("RUNTIME_BLOCK_HISTORY"); decision="NOT_ELIGIBLE"; }
    else if(candidate.successfulRuns<cfg.minSuccessfulRuns || candidate.verifiedSampleBatches<cfg.minVerifiedSampleBatches){ reasons.push("INSUFFICIENT_VERIFIED_RUNS"); decision="NOT_ELIGIBLE"; promotionStatus="CANDIDATE"; }
    else if(candidate.failureRatePercent>cfg.maxFailureRatePercent){ reasons.push("FAILURE_RATE_TOO_HIGH"); decision="NOT_ELIGIBLE"; }
    else if(!candidate.rollbackAvailable && cfg.rollbackRequired){ reasons.push("ROLLBACK_UNAVAILABLE"); decision="NOT_ELIGIBLE"; }
    else if(candidate.riskClass!==cfg.autoSafeAllowedRiskClass || candidate.blastRadiusBand!==cfg.autoSafeAllowedBlastRadius){ reasons.push("REQUIRES_SCHEDULED_APPROVAL"); decision="PROMOTE"; recommendedMode="SCHEDULED_SUPERVISED"; promotionStatus="READY_FOR_REVIEW"; }
    else { reasons.push("AUTO_SAFE_ELIGIBLE"); decision="PROMOTE"; recommendedMode="AUTO_EXECUTE_SAFE"; promotionStatus="READY_FOR_REVIEW"; }
    return { recommendedMode, promotionStatus, decision, reasons, evidence: this.buildEvidence(candidate, decision, reasons, recommendedMode, promotionStatus, cfg), eventType: "AUTOMATION_EVALUATED" };
  }
  evaluateDemotion(candidate:any,cfg=AUTO_DEFAULTS){ if(candidate.lastCriticalEscalationAt) return {mode:"RECOMMEND_ONLY",event:"AUTOMATION_REVOKED",decision:"REVOKE",reasons:["CRITICAL_ESCALATION_HISTORY"]}; if(candidate.lastRuntimeBlockAt || candidate.failureRatePercent>cfg.maxFailureRatePercent || !candidate.rollbackAvailable) return {mode:candidate.currentMode==="AUTO_EXECUTE_SAFE"?"SCHEDULED_SUPERVISED":"SUPERVISED_EXECUTION",event:"AUTOMATION_DEMOTED",decision:"DEMOTE",reasons:["RUNTIME_OR_FAILURE_OR_ROLLBACK"]}; return null; }
}
export class ExecutionQueueService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository(), private readonly telemetry = new ExecutionOrchestrationTelemetryService(repo), private readonly dependencyService = new ExecutionDependencyService(repo)) {}
  createPlan(input:any){ return this.repo.createPlan(input); }
  enqueueQueueItems(items:any[]){ return this.repo.enqueueQueueItems(items); }
  getReadyQueueItems(tenantId:string,limit:number){ return this.repo.getReadyQueueItems(tenantId,limit); }
  lockQueueItem(tenantId:string,id:number,workerId:string){ return this.repo.lockQueueItem(tenantId,id,workerId); }
  releaseExpiredLocks(){ return this.repo.releaseExpiredLocks(); }
  evaluateDependencies(tenantId:string){ return this.repo.evaluateDependencies(tenantId); }
  async markRunning(tenantId:string,id:number){ const row=await this.repo.updateItem(tenantId,id,{status:"RUNNING",lastAttemptAt:new Date()}); await this.telemetry.emitFailSafe({tenantId,queueItemId:id,planId:row?.planId,eventType:"ITEM_STARTED",source:"execution-orchestration",payload:{},correlationId:row?.correlationId}); return row; }
  async markSucceeded(tenantId:string,id:number,result:any){ const row=await this.repo.updateItem(tenantId,id,{status:"SUCCEEDED",executionResult:result,lockedAt:null,lockedBy:null}); await this.telemetry.emitFailSafe({tenantId,queueItemId:id,planId:row?.planId,eventType:"ITEM_SUCCEEDED",source:"execution-orchestration",payload:result,correlationId:row?.correlationId}); return row; }
  async markFailed(tenantId:string,id:number,failure:string){ const cur=await this.repo.updateItem(tenantId,id,{attemptCount:1}); const nextStatus = (cur?.attemptCount ?? 1) >= (cur?.maxAttempts ?? 1) ? "FAILED":"RETRY_SCHEDULED"; const row=await this.repo.updateItem(tenantId,id,{status:nextStatus,failureReason:failure,lockedAt:null,lockedBy:null}); await this.telemetry.emitFailSafe({tenantId,queueItemId:id,planId:row?.planId,eventType:"ITEM_FAILED",source:"execution-orchestration",payload:{failure,nextStatus},correlationId:row?.correlationId}); return row; }
  markBlocked(tenantId:string,id:number,reason:string){ return this.repo.updateItem(tenantId,id,{status:"BLOCKED",failureReason:reason,lockedAt:null,lockedBy:null}); }
  markQuarantined(tenantId:string,id:number,reason:string){ return this.repo.updateItem(tenantId,id,{status:"QUARANTINED",failureReason:reason,lockedAt:null,lockedBy:null}); }
  async pausePlan(plan:any){ transitionOrchestrationState(plan.status,"PAUSED"); await this.repo.updatePlan(plan.tenantId, plan.id, { status: "PAUSED" }); }
  async resumePlan(plan:any, actorId = "system"){
    if (!["PAUSED","ESCALATED"].includes(plan.status)) throw new Error(`Plan ${plan.id} in status ${plan.status} cannot resume`);
    if (["BLOCKED","QUARANTINED","CANCELLED","COMPLETED"].includes(plan.status)) throw new Error(`Plan ${plan.id} in status ${plan.status} cannot resume`);
    transitionOrchestrationState(plan.status,"READY");
    const updated = await this.repo.updatePlan(plan.tenantId, plan.id, { status: "READY" });
    const items = await this.repo.getPlanItems(plan.tenantId, plan.id);
    for (const i of items.filter((x:any)=>x.status==="PAUSED" || x.status === "WAITING_DEPENDENCIES")) await this.dependencyService.evaluateItemDependencyReadiness(plan.tenantId, i.id);
    await this.telemetry.emitFailSafe({ tenantId: plan.tenantId, planId: plan.id, eventType: "PLAN_RESUMED", source: "execution-orchestration", actorId, correlationId: plan.correlationId, payload: { previousStatus: plan.status, nextStatus: updated?.status ?? "READY" } });
    return updated;
  }
  async cancelPlan(planId:number,tenantId:string){ await this.repo.updatePlan(tenantId, planId, { status:"CANCELLED", cancelledAt:new Date()}); return this.repo.cancelPendingItems(tenantId, planId); }
  async retryQueueItem(tenantId:string,id:number,actorId="system"){
    const item = await this.repo.updateItem(tenantId,id,{});
    if (!item || !["FAILED","RETRY_SCHEDULED"].includes(item.status)) throw new Error(`Item ${id} in status ${item?.status} cannot retry`);
    const updated = await this.repo.updateItem(tenantId, id, { status: "RETRY_SCHEDULED", nextAttemptAt: new Date(), lockedAt:null, lockedBy:null });
    await this.telemetry.emitFailSafe({ tenantId, planId: item.planId, queueItemId: id, eventType: "ITEM_RETRY_REQUESTED", source: "execution-orchestration", actorId, correlationId: item.correlationId, payload: { previousStatus: item.status, nextStatus: "RETRY_SCHEDULED" } });
    return updated;
  }
  async cancelQueueItem(tenantId:string, id:number, actorId="system"){
    const item = await this.repo.updateItem(tenantId,id,{});
    const cancellable = ["PENDING","READY","WAITING_APPROVAL","WAITING_DEPENDENCIES","RETRY_SCHEDULED"];
    if (item?.status === "RUNNING") throw new Error("Running queue item cancellation is not supported safely yet");
    if (!item || !cancellable.includes(item.status)) throw new Error(`Item ${id} in status ${item?.status} cannot cancel`);
    const updated = await this.repo.updateItem(tenantId, id, { status: "CANCELLED", lockedAt:null, lockedBy:null });
    await this.telemetry.emitFailSafe({ tenantId, planId: item.planId, queueItemId: id, eventType: "ITEM_CANCELLED", source: "execution-orchestration", actorId, correlationId: item.correlationId, payload: { previousStatus: item.status, nextStatus: "CANCELLED" } });
    return updated;
  }
}

export class ExecutionOrchestrationProcessor {
  constructor(private readonly queue = new ExecutionQueueService(), private readonly telemetry = new ExecutionOrchestrationTelemetryService(), private readonly escalation = new ExecutionEscalationService()) {}
  async processReadyItem(tenantId:string, workerId:string, item:any) {
    const locked = await this.queue.lockQueueItem(tenantId, item.id, workerId); if (!locked) return { skipped: true, reason: "LOCK_FAILED" };
    if (item.blastRadiusBand === "CRITICAL") { await this.queue.markBlocked(tenantId, item.id, "BLAST_RADIUS_CRITICAL"); await this.escalation.escalateQueueItem({ tenantId, planId: item.planId, queueItemId: item.id, escalationType: "BLAST_RADIUS_LIMIT", severity: "CRITICAL", reason: "critical blast radius", correlationId: item.correlationId }); return { blocked: true }; }
    if (item.blastRadiusBand === "HIGH" && item.approvalStatus !== "APPROVED") { await this.queue.markBlocked(tenantId, item.id, "HIGH_BLAST_RADIUS_APPROVAL_REQUIRED"); return { blocked: true }; }
    const runtime = evaluateExecutionRuntimeControls({ tenantId, actorId: item.lockedBy ?? workerId, action: item.actionType, cooldownMs: 1, connectorStatus: item.connectorStatus, recentRollbackRate: item.recentRollbackRate });
    if (runtime.decision === "BLOCK") { await this.queue.markBlocked(tenantId, item.id, runtime.reasons.join(",")); await this.escalation.escalateQueueItem({ tenantId, planId: item.planId, queueItemId: item.id, escalationType: "RUNTIME_CONTROL_BLOCK", severity: "HIGH", reason: runtime.reasons.join(","), correlationId: item.correlationId }); return { blocked: true }; }
    if (runtime.decision === "QUARANTINE") { await this.queue.markQuarantined(tenantId, item.id, runtime.reasons.join(",")); await this.escalation.escalateQueueItem({ tenantId, planId: item.planId, queueItemId: item.id, escalationType: "RUNTIME_CONTROL_BLOCK", severity: "CRITICAL", reason: runtime.reasons.join(","), correlationId: item.correlationId }); return { quarantined: true }; }
    if (item.riskClass === "B" && item.approvalStatus !== "APPROVED") { await this.queue.markBlocked(tenantId, item.id, "APPROVAL_MISSING_OR_NOT_APPROVED"); return { blocked: true }; }
    await this.queue.markRunning(tenantId, item.id);
    try {
      const result = await runExecutionEngine({ tenantId, actorId: workerId, recommendation: { id: item.recommendationId, action: item.actionType, approvalStatus: item.approvalStatus }, mode: "APPROVAL_EXECUTE", mvpMode: true });
      if (!result.allowed || !result.executed) { await this.queue.markFailed(tenantId, item.id, JSON.stringify({ failure:(result.denialReasons ?? ["EXECUTION_DENIED"]).join(","), dependencySnapshot:{status:item.status}, approvalSnapshot:{approvalStatus:item.approvalStatus}, runtimeControlSnapshot:runtime, blastRadiusSnapshot:{band:item.blastRadiusBand}, slaSnapshot:{evaluatedAt:new Date().toISOString()}, executionEngineResult:result, stateTransition:{from:"RUNNING",to:"FAILED"}, outcomeLedgerId:null })); return { failed: true, result }; }
      await this.queue.markSucceeded(tenantId, item.id, { dependencySnapshot: { status: item.status }, approvalSnapshot: { approvalStatus: item.approvalStatus }, runtimeControlSnapshot: runtime, blastRadiusSnapshot: { band: item.blastRadiusBand }, slaSnapshot: { evaluatedAt: new Date().toISOString() }, executionEngineResult: result, stateTransition: { from: "RUNNING", to: "SUCCEEDED" }, outcomeLedgerId: null, idempotencyKey: result.idempotencyKey });
      return { succeeded: true, result };
    } catch (error) {
      await this.queue.markFailed(tenantId, item.id, String(error));
      return { failed: true, error: String(error) };
    }
  }
}
