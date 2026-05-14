import { db, executionOrchestrationEventsTable, executionOrchestrationPlansTable, executionQueueItemsTable } from "@workspace/db";
import { and, eq, isNull, lt, or } from "drizzle-orm";

export class ExecutionOrchestrationRepository {
  async createPlan(input: any) { const [plan] = await db.insert(executionOrchestrationPlansTable).values(input).returning(); return plan; }
  async getPlan(tenantId: string, planId: number) { const [plan] = await db.select().from(executionOrchestrationPlansTable).where(and(eq(executionOrchestrationPlansTable.tenantId, tenantId), eq(executionOrchestrationPlansTable.id, planId))).limit(1); return plan; }
  async listPlans(tenantId: string) { return db.select().from(executionOrchestrationPlansTable).where(eq(executionOrchestrationPlansTable.tenantId, tenantId)); }
  async enqueueQueueItems(items: any[]) { return db.insert(executionQueueItemsTable).values(items).returning(); }
  async getPlanItems(tenantId: string, planId: number) { return db.select().from(executionQueueItemsTable).where(and(eq(executionQueueItemsTable.tenantId, tenantId), eq(executionQueueItemsTable.planId, planId))); }
  async getPlanEvents(tenantId: string, planId: number) { return db.select().from(executionOrchestrationEventsTable).where(and(eq(executionOrchestrationEventsTable.tenantId, tenantId), eq(executionOrchestrationEventsTable.planId, planId))); }
  async getReadyQueueItems(tenantId: string, limit = 10) { return db.select().from(executionQueueItemsTable).where(and(eq(executionQueueItemsTable.tenantId, tenantId), eq(executionQueueItemsTable.status, "READY"), or(isNull(executionQueueItemsTable.lockedAt), lt(executionQueueItemsTable.lockedAt, new Date(Date.now()-60_000))))).limit(limit); }
  async lockQueueItem(tenantId: string, id: number, workerId: string) { const [row]=await db.update(executionQueueItemsTable).set({ lockedAt: new Date(), lockedBy: workerId }).where(and(eq(executionQueueItemsTable.id,id),eq(executionQueueItemsTable.tenantId,tenantId),eq(executionQueueItemsTable.status,"READY"),or(isNull(executionQueueItemsTable.lockedAt),lt(executionQueueItemsTable.lockedAt,new Date(Date.now()-60_000))))).returning(); return row; }
  async updateItem(tenantId:string,id:number,patch:any){ const [row]=await db.update(executionQueueItemsTable).set({...patch,updatedAt:new Date()}).where(and(eq(executionQueueItemsTable.id,id),eq(executionQueueItemsTable.tenantId,tenantId))).returning(); return row; }
  async releaseExpiredLocks() { return db.update(executionQueueItemsTable).set({ lockedAt: null, lockedBy: null }).where(lt(executionQueueItemsTable.lockedAt, new Date(Date.now()-60_000))).returning(); }
  async appendEvent(input:any){ const [e]=await db.insert(executionOrchestrationEventsTable).values(input).returning(); return e; }
}
