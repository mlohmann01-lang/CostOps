import { db, discoveredAppsTable, operationalizationPacksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getValueRealizationAnalytics(tenantId: string) {
  const [apps, packs] = await Promise.all([
    db.select().from(discoveredAppsTable).where(eq(discoveredAppsTable.tenantId, tenantId)),
    db.select().from(operationalizationPacksTable).where(eq(operationalizationPacksTable.tenantId, tenantId)),
  ]);
  const annual = apps.reduce((s: number, a: any) => s + Number(a.annualCost ?? 0), 0);
  const blocked = apps.filter((a:any)=>a.status!=="READY_FOR_GOVERNANCE").length;
  return { tenantId, annualSpendInScope: annual, blockedApps: blocked, packsWithHighReadiness: packs.filter((p:any)=>(p.readinessScore??0)>=80).length };
}
