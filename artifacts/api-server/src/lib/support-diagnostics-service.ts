import { and, count, desc, eq, sql } from "drizzle-orm";
import { REQUIRED_M365_RUNTIME_EVENTS, computeTelemetryCoverage } from "./observability/operational-telemetry-service";
import { connectorHealthSnapshotsTable, connectorSyncStatusTable, db, governancePolicyEngineTable, operationalEventsTable, policyExceptionsTable, workflowItemsTable } from "@workspace/db";

export class SupportDiagnosticsService {
  async getDiagnostics(tenantId: string) {
    const [health] = await db.select().from(connectorHealthSnapshotsTable).where(eq(connectorHealthSnapshotsTable.tenantId, tenantId)).orderBy(desc(connectorHealthSnapshotsTable.createdAt)).limit(1);
    const [sync] = await db.select().from(connectorSyncStatusTable).where(eq(connectorSyncStatusTable.tenantId, tenantId)).orderBy(desc(connectorSyncStatusTable.createdAt)).limit(1);
    const [events] = await db.select({failed: count()}).from(operationalEventsTable).where(and(eq(operationalEventsTable.tenantId, tenantId), eq(operationalEventsTable.eventStatus, "FAILED")));
    const [policies] = await db.select({active: count()}).from(governancePolicyEngineTable).where(and(eq(governancePolicyEngineTable.tenantId, tenantId), eq(governancePolicyEngineTable.policyStatus, "ACTIVE")));
    const [queue] = await db.select({pending: count()}).from(workflowItemsTable).where(and(eq(workflowItemsTable.tenantId, tenantId), eq(workflowItemsTable.status, "OPEN")));
    const [breaches] = await db.select({count: count()}).from(policyExceptionsTable).where(and(eq(policyExceptionsTable.tenantId, tenantId), sql`${policyExceptionsTable.expiryAt} < now()`));
    return { tenantId, connectorHealth: health?.healthStatus ?? "UNKNOWN", latestSyncStatus: sync?.connectorHealth ?? "UNKNOWN", telemetrySummary: { failedEvents: events?.failed ?? 0 }, graphIntegrityScore: Number(health?.trustScore ?? 0), activePolicyCount: policies?.active ?? 0, workflowQueueCounts: queue?.pending ?? 0, failedEventsJobs: events?.failed ?? 0, slaBreaches: breaches?.count ?? 0 };
  }

  async getRuntimeHealthAssertions(tenantId: string) {
    const events = await db.select().from(operationalEventsTable).where(eq(operationalEventsTable.tenantId, tenantId));
    const workflows = await db.select().from(workflowItemsTable).where(eq(workflowItemsTable.tenantId, tenantId));
    const slaBreachCount = workflows.filter((w:any)=>String(w.slaStatus)==='BREACHED').length;
    const replayMismatch = events.filter((e:any)=>String(e.eventType).includes('REPLAY_MISMATCH')).length;
    const telemetryContinuityHealth = events.length > 0 ? 'HEALTHY' : 'DEGRADED';
    const replayIntegrityHealth = replayMismatch === 0 ? 'HEALTHY' : 'DEGRADED';
    const workflowEscalationHealth = slaBreachCount === 0 ? 'HEALTHY' : 'DEGRADED';
    const orphanStateCount = 0;
    const correlationContinuityHealth = events.some((e:any)=>!e.correlationId) ? 'DEGRADED' : 'HEALTHY';
    return { telemetryContinuityHealth, replayIntegrityHealth, workflowEscalationHealth, orphanStateCount, slaBreachCount, correlationContinuityHealth };
  }

  async getRuntimeConsistencyDiagnostics(tenantId: string) {
    const events = await db.select().from(operationalEventsTable).where(eq(operationalEventsTable.tenantId, tenantId));
    const telemetry = computeTelemetryCoverage(events as any[]);
    const workflows = await db.select().from(workflowItemsTable).where(eq(workflowItemsTable.tenantId, tenantId));
    const replayGapCount = events.filter((e:any)=>String(e.eventType).includes('REPLAY_MISMATCH')).length;
    const staleWorkflowChains = workflows.filter((w:any)=>String(w.status)!=='RESOLVED' && String(w.slaStatus)==='BREACHED').length;
    const orphanOperationalObjects = workflows.filter((w:any)=>!w.recommendationId).length;
    return {
      telemetryCoveragePercent: telemetry.coveragePercent,
      replayCoveragePercent: Math.max(0, 100 - replayGapCount * 10),
      workflowTraceCoveragePercent: workflows.length ? Math.max(0, 100 - staleWorkflowChains * 10) : 100,
      lifecycleCoveragePercent: events.some((e:any)=>String(e.eventType)==='M365_LIFECYCLE_TRANSITION') ? 100 : 0,
      correlationContinuityPercent: events.length ? Math.max(0, Math.round(((events.length - telemetry.missingCorrelationCount) / events.length) * 100)) : 100,
      orphanOperationalObjects,
      legacyBypassDetections: 0,
      staleWorkflowChains,
      replayGapCount,
      requiredEventCount: REQUIRED_M365_RUNTIME_EVENTS.length,
    };
  }
}
