import { runExecutionEngine } from "../execution/execution-engine";
import { evaluateExecutionRuntimeControls } from "../security/runtime-controls";
import { transitionOrchestrationState } from "./execution-orchestration-state-machine";
import { ExecutionOrchestrationRepository } from "./execution-orchestration.repository";

export class ExecutionOrchestrationTelemetryService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository()) {}
  async emit(event: any) {
    try { return await this.repo.appendEvent(event); }
    catch (error) { console.error("execution_orchestration_event_persist_failed", { event, error }); throw error; }
  }
  async emitFailSafe(event: any) {
    try { return await this.emit(event); }
    catch (error) { return { failedToPersist: true, event, error: String(error) }; }
  }
}

export class ExecutionQueueService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository(), private readonly telemetry = new ExecutionOrchestrationTelemetryService(repo)) {}
  createPlan(input:any){ return this.repo.createPlan(input); }
  enqueueQueueItems(items:any[]){ return this.repo.enqueueQueueItems(items); }
  getReadyQueueItems(tenantId:string,limit:number){ return this.repo.getReadyQueueItems(tenantId,limit); }
  lockQueueItem(tenantId:string,id:number,workerId:string){ return this.repo.lockQueueItem(tenantId,id,workerId); }
  releaseExpiredLocks(){ return this.repo.releaseExpiredLocks(); }
  async markRunning(tenantId:string,id:number){ const row=await this.repo.updateItem(tenantId,id,{status:"RUNNING",lastAttemptAt:new Date()}); await this.telemetry.emitFailSafe({tenantId,queueItemId:id,planId:row?.planId,eventType:"ITEM_STARTED",source:"execution-orchestration",payload:{}}); return row; }
  async markSucceeded(tenantId:string,id:number,result:any){ const row=await this.repo.updateItem(tenantId,id,{status:"SUCCEEDED",executionResult:result,lockedAt:null,lockedBy:null}); await this.telemetry.emitFailSafe({tenantId,queueItemId:id,planId:row?.planId,eventType:"ITEM_SUCCEEDED",source:"execution-orchestration",payload:result}); return row; }
  async markFailed(tenantId:string,id:number,failure:string){ const cur=await this.repo.updateItem(tenantId,id,{attemptCount:1}); const nextStatus = (cur?.attemptCount ?? 1) >= (cur?.maxAttempts ?? 1) ? "FAILED":"RETRY_SCHEDULED"; const row=await this.repo.updateItem(tenantId,id,{status:nextStatus,failureReason:failure,lockedAt:null,lockedBy:null}); await this.telemetry.emitFailSafe({tenantId,queueItemId:id,planId:row?.planId,eventType:"ITEM_FAILED",source:"execution-orchestration",payload:{failure,nextStatus}}); return row; }
  markBlocked(tenantId:string,id:number,reason:string){ return this.repo.updateItem(tenantId,id,{status:"BLOCKED",failureReason:reason,lockedAt:null,lockedBy:null}); }
  markQuarantined(tenantId:string,id:number,reason:string){ return this.repo.updateItem(tenantId,id,{status:"QUARANTINED",failureReason:reason,lockedAt:null,lockedBy:null}); }
  async pausePlan(plan:any){ transitionOrchestrationState(plan.status,"PAUSED"); }
  async cancelPlan(planId:number,tenantId:string){ return this.repo.updateItem(tenantId,planId,{status:"CANCELLED"}); }
}

export class ExecutionOrchestrationProcessor {
  constructor(private readonly queue = new ExecutionQueueService(), private readonly telemetry = new ExecutionOrchestrationTelemetryService()) {}
  async processReadyItem(tenantId:string, workerId:string, item:any) {
    const locked = await this.queue.lockQueueItem(tenantId, item.id, workerId); if (!locked) return { skipped: true, reason: "LOCK_FAILED" };
    const runtime = evaluateExecutionRuntimeControls({ tenantId, actorId: item.lockedBy ?? workerId, action: item.actionType, cooldownMs: 1, connectorStatus: item.connectorStatus, recentRollbackRate: item.recentRollbackRate });
    if (runtime.decision === "BLOCK") { await this.queue.markBlocked(tenantId, item.id, runtime.reasons.join(",")); await this.telemetry.emitFailSafe({ tenantId, queueItemId: item.id, planId: item.planId, eventType: "ITEM_BLOCKED", source: "execution-orchestration", payload: runtime }); return { blocked: true }; }
    if (runtime.decision === "QUARANTINE") { await this.queue.markQuarantined(tenantId, item.id, runtime.reasons.join(",")); return { quarantined: true }; }
    if (item.riskClass === "B" && item.approvalStatus !== "APPROVED") { await this.queue.markBlocked(tenantId, item.id, "APPROVAL_MISSING_OR_NOT_APPROVED"); return { blocked: true }; }
    await this.queue.markRunning(tenantId, item.id);
    try {
      const result = await runExecutionEngine({ tenantId, actorId: workerId, recommendation: { id: item.recommendationId, action: item.actionType, approvalStatus: item.approvalStatus }, mode: "APPROVAL_EXECUTE", mvpMode: true });
      if (!result.allowed || !result.executed) { await this.queue.markFailed(tenantId, item.id, (result.denialReasons ?? ["EXECUTION_DENIED"]).join(",")); return { failed: true, result }; }
      await this.queue.markSucceeded(tenantId, item.id, { idempotencyKey: result.idempotencyKey });
      return { succeeded: true, result };
    } catch (error) {
      await this.queue.markFailed(tenantId, item.id, String(error));
      return { failed: true, error: String(error) };
    }
  }
}
