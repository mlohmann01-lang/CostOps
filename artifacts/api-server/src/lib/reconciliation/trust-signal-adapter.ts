import { db, reconciliationFindingsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

import { mapTrustSignalsFromFindings } from "./trust-signal-mapper";

export async function buildTrustSignalsFromFindings(tenantId: string, entityKey: string) {
  const findings = await db
    .select()
    .from(reconciliationFindingsTable)
    .where(and(eq(reconciliationFindingsTable.tenantId, tenantId), eq(reconciliationFindingsTable.entityKey, entityKey)));

  return mapTrustSignalsFromFindings(findings);
}
