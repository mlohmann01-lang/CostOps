import { db, metadataMappingEventsTable, operationalizationPackEventsTable, outcomeLedgerTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export async function getEvidenceExplorer(tenantId: string) {
  const [mappings, packEvents, outcomes] = await Promise.all([
    db.select().from(metadataMappingEventsTable).where(eq(metadataMappingEventsTable.tenantId, tenantId)).orderBy(desc(metadataMappingEventsTable.createdAt)).limit(100),
    db.select().from(operationalizationPackEventsTable).where(eq(operationalizationPackEventsTable.tenantId, tenantId)).orderBy(desc(operationalizationPackEventsTable.createdAt)).limit(100),
    db.select().from(outcomeLedgerTable).where(eq(outcomeLedgerTable.tenantId, tenantId)).orderBy(desc(outcomeLedgerTable.createdAt)).limit(50),
  ]);
  return { tenantId, mappings, packEvents, outcomes };
}
