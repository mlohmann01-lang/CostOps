import { deadLetterJob, failJobRun, startJobRun, completeJobRun } from "./job-events";
import { JOB_HANDLERS } from "./job-registry";

export async function runJob(input:{tenantId:string;jobType:string;payload?:any;scheduledJobId?:number}){
  const started=Date.now(); const run=await startJobRun(input);
  try{ const out=await JOB_HANDLERS[input.jobType]?.({tenantId:input.tenantId,...(input.payload??{})});
    const status=out?.status==="SKIPPED"?"SKIPPED":"SUCCEEDED";
    const done=await completeJobRun(run.id,{status,durationMs:Date.now()-started,recordsProcessed:out?.rows??0,warnings:out?.warnings??[],errors:[],evidence:out??{}});
    return {ok:true,run:done};
  }catch(err:any){ await failJobRun(run.id,{message:err?.message??"UNKNOWN"}); if(err?.irrecoverable){ await deadLetterJob({jobRunId:String(run.id),tenantId:input.tenantId,jobType:input.jobType,reason:err.message??"IRRECOVERABLE",payload:input.payload??{},error:{message:err.message},retryCount:0}); }
    return {ok:false,error:String(err?.message??err),runId:run.id}; }
}
