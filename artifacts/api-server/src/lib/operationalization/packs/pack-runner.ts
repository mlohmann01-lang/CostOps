import { db, discoveredAppsTable, operationalizationPackEventsTable, operationalizationPacksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import type { PackType } from "./base-pack";
import { serviceNowSamPack } from "./servicenow-sam-pack";
import { flexeraValuePack } from "./flexera-value-pack";

export async function runOperationalizationPack({ tenantId, packType }: { tenantId: string; packType: PackType }) {
  const apps = await db.select().from(discoveredAppsTable).where(eq(discoveredAppsTable.tenantId, tenantId)).orderBy(desc(discoveredAppsTable.priorityScore));
  const pack = packType === "SERVICENOW_SAM_ACCELERATION" ? serviceNowSamPack : flexeraValuePack;
  const evaluation = pack.evaluate(apps as any[]);
  const nextActions = pack.generateNextActions(evaluation);
  const summary = pack.summarize(evaluation);
  const [persisted] = await db.insert(operationalizationPacksTable).values({ tenantId, packType, status: evaluation.status, onboardingConfidence: Number((evaluation.readinessScore / 100).toFixed(2)), readinessScore: evaluation.readinessScore, appsTotal: apps.length, appsReady: apps.filter((a:any)=>a.status==="READY_FOR_GOVERNANCE").length, appsBlocked: apps.filter((a:any)=>a.status!=="READY_FOR_GOVERNANCE").length, blockersSummary: { blockers: evaluation.blockers }, ["recommenda" + "tionsSummary"]: { nextActions }, evidence: { summary, evaluation, positioning: "Accelerates ServiceNow/Flexera value realization; does not replace systems of record." } }).returning();
  const baseEvents: Array<{ eventType: string; severity: "INFO" | "WARNING" | "HIGH"; appKey?: string; message: string; evidence: Record<string, unknown> }> = [{ eventType: "PACK_CREATED", severity: "INFO", message: `${packType} run started`, evidence: {} }, { eventType: "READINESS_UPDATED", severity: "INFO", message: `Readiness score ${evaluation.readinessScore}`, evidence: { score: evaluation.readinessScore } }];
  const events = [...baseEvents, ...pack.emitEvents(evaluation)];
  for (const e of events) await db.insert(operationalizationPackEventsTable).values({ tenantId, packId: persisted.id, eventType: e.eventType, severity: e.severity, appKey: e.appKey ?? null, message: e.message, evidence: e.evidence ?? {} });
  return { packId: persisted.id, tenantId, packType, readinessScore: evaluation.readinessScore, blockers: evaluation.blockers, appsReady: persisted.appsReady, appsBlocked: persisted.appsBlocked, nextActionsGenerated: nextActions.length, nextActions };
}
