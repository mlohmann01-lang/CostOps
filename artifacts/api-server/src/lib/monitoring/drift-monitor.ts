import { db, driftEventsTable, recommendationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ingestM365Tenant } from "../connectors/m365-ingestion";

export type DriftType = "LICENCE_REASSIGNED" | "USER_REACTIVATED" | "SOURCE_UNAVAILABLE" | "NO_DRIFT";
export type DriftStatus = "OPEN" | "RESOLVED" | "INFO";

export async function checkM365LicenceReclaimDrift(outcomeLedgerRow: any) {
  const tenantId = outcomeLedgerRow.tenantId ?? "default";
  const recommendationId = String(outcomeLedgerRow.recommendationId);
  const action = outcomeLedgerRow.action;

  const [recommendation] = await db
    .select()
    .from(recommendationsTable)
    .where(eq(recommendationsTable.id, Number(recommendationId)));

  const userPrincipalName = recommendation?.userEmail ?? "";
  const base = {
    tenantId,
    recommendationId,
    outcomeLedgerId: outcomeLedgerRow.id,
    userPrincipalName,
    action,
    detectedAt: new Date(),
  };

  if (action !== "REMOVE_LICENSE") {
    return db.insert(driftEventsTable).values({ ...base, driftType: "NO_DRIFT", driftStatus: "INFO", evidence: { reason: "UNSUPPORTED_ACTION" } }).returning();
  }

  const ingestion = await ingestM365Tenant(tenantId);
  const sourceTimestamp = new Date(ingestion.metadata.lastSyncTime);
  const stale = Number.isNaN(sourceTimestamp.getTime()) || Date.now() - sourceTimestamp.getTime() > 1000 * 60 * 60 * 24;
  if (ingestion.metadata.connectorHealth !== "HEALTHY" || stale) {
    return db.insert(driftEventsTable).values({
      ...base,
      driftType: "SOURCE_UNAVAILABLE",
      driftStatus: "OPEN",
      evidence: { connectorHealth: ingestion.metadata.connectorHealth, lastSyncTime: ingestion.metadata.lastSyncTime, stale },
    }).returning();
  }

  const current = ingestion.users.find((u) => u.userPrincipalName === userPrincipalName);
  if (!current) {
    return db.insert(driftEventsTable).values({ ...base, driftType: "SOURCE_UNAVAILABLE", driftStatus: "OPEN", evidence: { reason: "USER_NOT_FOUND" } }).returning();
  }

  if (current.accountEnabled) {
    return db.insert(driftEventsTable).values({ ...base, driftType: "USER_REACTIVATED", driftStatus: "OPEN", evidence: { accountEnabled: true } }).returning();
  }

  const reclaimedSku = outcomeLedgerRow.beforeState?.licenceSku ?? outcomeLedgerRow.beforeState?.licenseSku;
  if (reclaimedSku && Array.isArray(current.assignedLicenses) && current.assignedLicenses.includes(reclaimedSku)) {
    return db.insert(driftEventsTable).values({
      ...base,
      driftType: "LICENCE_REASSIGNED",
      driftStatus: "OPEN",
      evidence: { reclaimedSku, assignedLicenses: current.assignedLicenses, savingAtRisk: true },
    }).returning();
  }

  return db.insert(driftEventsTable).values({
    ...base,
    driftType: "NO_DRIFT",
    driftStatus: "INFO",
    evidence: { accountEnabled: current.accountEnabled, assignedLicenses: current.assignedLicenses },
  }).returning();
}
