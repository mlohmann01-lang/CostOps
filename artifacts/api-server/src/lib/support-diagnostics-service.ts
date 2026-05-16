import { and, count, desc, eq, sql } from "drizzle-orm";
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
}
