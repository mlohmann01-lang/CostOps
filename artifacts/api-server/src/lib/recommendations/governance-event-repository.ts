import { and, desc, eq } from "drizzle-orm";
import { db, recommendationGovernanceEventsTable } from "@workspace/db";

export type GovernanceEventType = "RECOMMENDATION_CREATED"|"RECOMMENDATION_RECALCULATED"|"RECOMMENDATION_APPROVED"|"RECOMMENDATION_BLOCKED"|"APPROVAL_REJECTED"|"READINESS_CHANGED"|"POLICY_BLOCKED"|"EXECUTION_STARTED"|"EXECUTION_BLOCKED"|"EXECUTION_COMPLETED"|"EXECUTION_FAILED"|"EXECUTION_ROLLBACK_TRIGGERED";
export type GovernanceEventStorageMode = "database" | "memory";

export class RecommendationGovernanceEventRepository {
  private static mem = new Map<string, any[]>();
  constructor(private readonly options: { storageMode?: GovernanceEventStorageMode } = {}) {}
  private env() { return String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase(); }
  private isProdLike() { const e = this.env(); return e === "production" || e === "staging"; }
  private mode(): GovernanceEventStorageMode {
    if (!this.options.storageMode && this.env() === "test") return "memory";
    if (this.options.storageMode) {
      if (this.options.storageMode === "memory" && this.isProdLike()) throw new Error("FAIL_CLOSED: memory mode is forbidden in staging/production");
      return this.options.storageMode;
    }
    return "database";
  }
  async append(event: typeof recommendationGovernanceEventsTable.$inferInsert) {
    if (this.mode() === "memory") {
      const key=`${event.tenantId}:${event.recommendationId}`; const arr=RecommendationGovernanceEventRepository.mem.get(key)??[]; const row={id:Date.now(),createdAt:new Date(),...event}; arr.push(row); RecommendationGovernanceEventRepository.mem.set(key,arr); return row;
    }
    try { const [row]=await db.insert(recommendationGovernanceEventsTable).values(event).returning(); return row; }
    catch(e){ if(this.isProdLike()) throw new Error(`FAIL_CLOSED: governance event DB unavailable: ${(e as Error).message}`); throw e; }
  }
  async list(tenantId: string, recommendationId: string) {
    if (this.mode() === "memory") return (RecommendationGovernanceEventRepository.mem.get(`${tenantId}:${recommendationId}`)??[]).slice().sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    try { return db.select().from(recommendationGovernanceEventsTable).where(and(eq(recommendationGovernanceEventsTable.tenantId,tenantId),eq(recommendationGovernanceEventsTable.recommendationId,recommendationId))).orderBy(desc(recommendationGovernanceEventsTable.createdAt)); }
    catch(e){ if(this.isProdLike()) throw new Error(`FAIL_CLOSED: governance event DB unavailable: ${(e as Error).message}`); throw e; }
  }
}
