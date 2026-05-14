import { db, connectorSyncStatusTable } from "@workspace/db";
import { desc } from "drizzle-orm";

export async function getConnectorOperationsConsole() {
  const rows = await db.select().from(connectorSyncStatusTable).orderBy(desc(connectorSyncStatusTable.lastSyncTime));
  return { connectors: rows.slice(0, 200), staleConnectors: rows.filter((r: any) => (r.dataFreshnessScore ?? 1) < 0.5).length };
}
