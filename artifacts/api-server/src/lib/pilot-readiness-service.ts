import { and, desc, eq } from "drizzle-orm";
import { connectorHealthSnapshotsTable, connectorSyncStatusTable, connectorTrustSnapshotsTable, db, governancePolicyEngineTable, operationalEntitiesTable, operationalEventsTable, pilotProfilesTable, recommendationsTable, tenantOnboardingTable, workflowItemsTable } from "@workspace/db";

export class PilotReadinessService {
  async evaluate(tenantId: string) {
    const [onboarding] = await db.select().from(tenantOnboardingTable).where(eq(tenantOnboardingTable.tenantId, tenantId)).limit(1);
    const [profile] = await db.select().from(pilotProfilesTable).where(eq(pilotProfilesTable.tenantId, tenantId)).limit(1);
    const [sync] = await db.select().from(connectorSyncStatusTable).where(eq(connectorSyncStatusTable.tenantId, tenantId)).orderBy(desc(connectorSyncStatusTable.createdAt)).limit(1);
    const [trust] = await db.select().from(connectorTrustSnapshotsTable).where(eq(connectorTrustSnapshotsTable.tenantId, tenantId)).orderBy(desc(connectorTrustSnapshotsTable.createdAt)).limit(1);
    const policies = await db.select().from(governancePolicyEngineTable).where(and(eq(governancePolicyEngineTable.tenantId, tenantId), eq(governancePolicyEngineTable.policyStatus, "ACTIVE")));
    const workflows = await db.select().from(workflowItemsTable).where(eq(workflowItemsTable.tenantId, tenantId));
    const [telemetry] = await db.select().from(operationalEventsTable).where(eq(operationalEventsTable.tenantId, tenantId)).orderBy(desc(operationalEventsTable.createdAt)).limit(1);
    const [entity] = await db.select().from(operationalEntitiesTable).where(eq(operationalEntitiesTable.tenantId, tenantId)).limit(1);
    const [golden] = await db.select().from(recommendationsTable).where(and(eq(recommendationsTable.tenantId, tenantId), eq(recommendationsTable.status, "APPROVED"))).limit(1);
    const out = {
      tenantConfigured: !!onboarding,
      adminConfigured: !!onboarding,
      connectorConfigured: !!sync,
      trustAvailable: !!trust,
      policiesActive: policies.length > 0,
      workflowConfigured: workflows.length > 0,
      telemetryHealthy: !!telemetry,
      graphBuilt: !!entity,
      goldenPathAvailable: !!golden,
      readinessStatus: "NEEDS_CONFIGURATION" as "READY"|"NEEDS_CONFIGURATION"|"BLOCKED",
    };
    const values = Object.values(out).filter((x) => typeof x === "boolean") as boolean[];
    out.readinessStatus = values.every(Boolean) ? "READY" : (out.tenantConfigured ? "NEEDS_CONFIGURATION" : "BLOCKED");
    return out;
  }
}
