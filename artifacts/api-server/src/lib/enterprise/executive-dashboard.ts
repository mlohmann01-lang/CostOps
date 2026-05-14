import { db, discoveredAppsTable, operationalizationPacksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getExecutiveDashboard(tenantId: string) {
  const [apps, packs] = await Promise.all([
    db.select().from(discoveredAppsTable).where(eq(discoveredAppsTable.tenantId, tenantId)),
    db.select().from(operationalizationPacksTable).where(eq(operationalizationPacksTable.tenantId, tenantId)),
  ]);
  const avgConfidence = apps.length ? apps.reduce((s: number, a: any) => s + (a.onboardingConfidence ?? 0), 0) / apps.length : 0;
  return { tenantId, appsTotal: apps.length, avgOnboardingConfidence: Number(avgConfidence.toFixed(3)), packsRun: packs.length, readyApps: apps.filter((a:any)=>a.status==="READY_FOR_GOVERNANCE").length };
}
