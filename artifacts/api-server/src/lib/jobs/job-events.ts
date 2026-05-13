import { db, deadLetterJobsTable, jobRunsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
export async function startJobRun(input:any){ const [r]=await db.insert(jobRunsTable).values({scheduledJobId:input.scheduledJobId??null,tenantId:input.tenantId,jobType:input.jobType,status:"RUNNING"}).returning(); return r; }
export async function completeJobRun(id:number,patch:any){ const [r]=await db.update(jobRunsTable).set({status:patch.status,completedAt:new Date(),durationMs:patch.durationMs,recordsProcessed:patch.recordsProcessed??0,recordsSucceeded:patch.recordsSucceeded??0,recordsFailed:patch.recordsFailed??0,warnings:patch.warnings??[],errors:patch.errors??[],evidence:patch.evidence??{}}).where(eq(jobRunsTable.id,id)).returning(); return r; }
export async function failJobRun(id:number,err:any){ return completeJobRun(id,{status:"FAILED",durationMs:0,errors:[err]}); }
export async function deadLetterJob(input:any){ const [r]=await db.insert(deadLetterJobsTable).values(input).returning(); return r; }
