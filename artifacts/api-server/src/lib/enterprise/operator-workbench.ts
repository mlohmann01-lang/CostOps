import { db, connectorsTable, jobRunsTable, platformEventsTable, scheduledJobsTable } from "@workspace/db";

export async function getOperatorWorkbenchSummary(tenantId: string) {
  const [connectors, jobs, schedules, events] = await Promise.all([
    db.select().from(connectorsTable),
    db.select().from(jobRunsTable),
    db.select().from(scheduledJobsTable),
    db.select().from(platformEventsTable),
  ]);
  return {
    tenantId,
    positioning: "Complements ServiceNow/Flexera by accelerating operations; does not replace systems of record.",
    connectorsActive: connectors.filter((c: any) => c.status === "CONNECTED").length,
    jobsRunning: jobs.filter((j: any) => j.status === "RUNNING").length,
    schedulesEnabled: schedules.filter((s: any) => s.enabled === "true").length,
    runtimeControlEvents: events.filter((e: any) => ["RUNTIME_CONTROL_WARN","RUNTIME_CONTROL_BLOCK","RUNTIME_CONTROL_QUARANTINE","JOB_QUARANTINED","SUSPICIOUS_APPROVAL_DETECTED"].includes(e.eventType)).map((e:any)=>({ eventType:e.eventType, severity:e.severity, actor:(e.evidence as any)?.actorId ?? "", tenant:e.tenantId, affectedEntity:`${e.entityType ?? "entity"}:${e.entityId ?? ""}`, reason:e.message, evidence:e.evidence }))
  };
}
