import { db, jobRunsTable, scheduledJobsTable } from "@workspace/db";
import { and, eq, isNull, lte } from "drizzle-orm";
import { runJob } from "./job-runner";

export function calculateNextRun(scheduleConfig:any, from=new Date()){ const d=new Date(from); const f=scheduleConfig?.frequency??"DAILY"; if(f==="HOURLY") d.setHours(d.getHours()+1); else if(f==="WEEKLY") d.setDate(d.getDate()+7); else d.setDate(d.getDate()+1); d.setMinutes(scheduleConfig?.minute??0,0,0); if(scheduleConfig?.hour!=null) d.setHours(scheduleConfig.hour); return d; }
export async function getDueJobs(now=new Date()){ return db.select().from(scheduledJobsTable).where(and(eq(scheduledJobsTable.enabled,"true"), lte(scheduledJobsTable.nextRunAt, now))); }
export async function runDueJobs(){ const due=await getDueJobs(new Date()); const results=[] as any[]; for(const job of due){ const [running]=await db.select().from(jobRunsTable).where(and(eq(jobRunsTable.tenantId,job.tenantId),eq(jobRunsTable.jobType,job.jobType),eq(jobRunsTable.status,"RUNNING"))).limit(1); if(running){ results.push({jobId:job.id,status:"SKIPPED"}); continue; }
const r=await runJob({tenantId:job.tenantId,jobType:job.jobType,scheduledJobId:job.id,payload:{}}); await db.update(scheduledJobsTable).set({lastRunAt:new Date(),nextRunAt:calculateNextRun(job.scheduleConfig),status:r.ok?"SUCCEEDED":"FAILED"}).where(eq(scheduledJobsTable.id,job.id)); results.push({jobId:job.id,status:r.ok?"SUCCEEDED":"FAILED"}); }
 return results; }
