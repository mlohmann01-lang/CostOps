import { deadLetterJob, failJobRun, startJobRun, completeJobRun } from "./job-events";
import { evaluateJobRuntimeControls, trackJobFailure } from "../security/runtime-controls";
import { emitPlatformEvent } from "../observability/platform-events";
import { JOB_HANDLERS } from "./job-registry";

export async function runJob(input:{tenantId:string;jobType:string;payload?:any;scheduledJobId?:number;failedCount?:number;duplicateRunning?:boolean;connectorStatus?:string}){
  const runtime = evaluateJobRuntimeControls({ tenantId: input.tenantId, jobType: input.jobType, failedCount: input.failedCount, duplicateRunning: input.duplicateRunning, connectorStatus: input.connectorStatus });
  if (runtime.decision === "QUARANTINE") {
    await emitPlatformEvent({ tenantId: input.tenantId, eventType: "JOB_QUARANTINED", severity: "HIGH", source: "job-runner", correlationId: `${input.tenantId}:${input.jobType}`, entityType: "job", entityId: input.jobType, message: runtime.reasons.join(","), evidence: runtime.evidence });
    await deadLetterJob({ jobRunId: `quarantine:${input.tenantId}:${input.jobType}`, tenantId: input.tenantId, jobType: input.jobType, reason: runtime.reasons.join(","), payload: input.payload ?? {}, error: { message: runtime.reasons.join(",") }, retryCount: input.failedCount ?? 0 });
    return {ok:false,error:"JOB_QUARANTINED"};
  }
  const started=Date.now(); const run=await startJobRun(input);
  try{ const out=await JOB_HANDLERS[input.jobType]?.({tenantId:input.tenantId,...(input.payload??{})});
    const status=out?.status==="SKIPPED"?"SKIPPED":"SUCCEEDED";
    const done=await completeJobRun(run.id,{status,durationMs:Date.now()-started,recordsProcessed:out?.rows??0,warnings:out?.warnings??[],errors:[],evidence:out??{}});
    return {ok:true,run:done};
  }catch(err:any){ await failJobRun(run.id,{message:err?.message??"UNKNOWN"}); trackJobFailure(input.tenantId,input.jobType); if(err?.irrecoverable){ await deadLetterJob({jobRunId:String(run.id),tenantId:input.tenantId,jobType:input.jobType,reason:err.message??"IRRECOVERABLE",payload:input.payload??{},error:{message:err.message},retryCount:0}); }
    return {ok:false,error:String(err?.message??err),runId:run.id}; }
}
