import { db, connectorsTable, jobRunsTable, scheduledJobsTable } from "@workspace/db";

export async function getOperatorWorkbenchSummary(tenantId: string) {
  const [connectors, jobs, schedules] = await Promise.all([
    db.select().from(connectorsTable),
    db.select().from(jobRunsTable),
    db.select().from(scheduledJobsTable),
  ]);
  return {
    tenantId,
    positioning: "Complements ServiceNow/Flexera by accelerating operations; does not replace systems of record.",
    connectorsActive: connectors.filter((c: any) => c.status === "CONNECTED").length,
    jobsRunning: jobs.filter((j: any) => j.status === "RUNNING").length,
    schedulesEnabled: schedules.filter((s: any) => s.enabled === "true").length,
  };
}
