import { db, driftEventsTable, outcomeLedgerTable, recommendationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export async function runM365BetaDriftCheck(tenantId: string) {
  const outcomes = await db.select().from(outcomeLedgerTable).where(eq(outcomeLedgerTable.tenantId, tenantId));
  let created = 0;
  let updated = 0;

  for (const outcome of outcomes) {
    if (!['PROJECTED', 'DRY_RUN_COMPLETED'].includes(String(outcome.executionStatus ?? ''))) continue;
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, outcome.recommendationId)).limit(1);
    if (!rec) continue;
    const driftType = String(outcome.executionStatus) === 'DRY_RUN_COMPLETED' ? 'DRY_RUN_NOT_EXECUTED' : (String(rec.userEmail).includes('inactive.') ? 'INACTIVE_LICENSED_USER_STILL_LICENSED' : 'DISABLED_LICENSED_USER_STILL_LICENSED');
    const stableKey = `${tenantId}:${outcome.recommendationId}:${driftType}`;
    const [existing] = await db.select().from(driftEventsTable).where(and(eq(driftEventsTable.tenantId, tenantId), eq(driftEventsTable.recommendationId, String(outcome.recommendationId)), eq(driftEventsTable.driftType, driftType))).limit(1);
    const evidence = { valueAtRisk: Number(outcome.monthlySaving ?? 0), stableKey, linkedRecommendationId: outcome.recommendationId, linkedOutcomeLedgerId: outcome.id, severity: 'MEDIUM' };
    if (existing) {
      await db.update(driftEventsTable).set({ driftStatus: 'OPEN', evidence, detectedAt: new Date() }).where(eq(driftEventsTable.id, existing.id));
      updated += 1;
    } else {
      await db.insert(driftEventsTable).values({ tenantId, recommendationId: String(outcome.recommendationId), outcomeLedgerId: outcome.id, userPrincipalName: rec.userEmail, action: String(outcome.action), driftType, driftStatus: 'OPEN', evidence });
      created += 1;
    }
  }

  const all = await db.select().from(driftEventsTable).where(eq(driftEventsTable.tenantId, tenantId));
  const active = all.filter((e: any) => String(e.driftStatus).toUpperCase() === 'OPEN');
  const valueAtRisk = active.reduce((n: number, e: any) => n + Number((e.evidence as any)?.valueAtRisk ?? 0), 0);
  return { status: 'COMPLETED', summary: { activeDriftEvents: active.length, valueAtRisk, monitoredRecommendations: outcomes.length, created, updated }, events: active };
}
