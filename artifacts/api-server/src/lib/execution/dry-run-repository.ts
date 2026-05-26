import { and, desc, eq } from "drizzle-orm";
import { db, executionRequestDryRunsTable } from "@workspace/db";

function allowMemory(){ const e=String(process.env.RUNTIME_ENV??process.env.NODE_ENV??"development").toLowerCase(); return e==="test"||e==="development"; }

export class ExecutionDryRunRepository {
  private static mem = new Map<string, any[]>();
  private key(t:string,r:string){return `${t}:${r}`;}
  async create(row: typeof executionRequestDryRunsTable.$inferInsert) {
    try { const [saved]=await db.insert(executionRequestDryRunsTable).values(row).returning(); return saved; }
    catch(e){ if(!allowMemory()) throw new Error(`DRY_RUN_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`); const k=this.key(row.tenantId,row.executionRequestId); const arr=ExecutionDryRunRepository.mem.get(k)??[]; const saved={id:Date.now(),createdAt:new Date(),...row}; arr.unshift(saved); ExecutionDryRunRepository.mem.set(k,arr); return saved; }
  }
  async latest(tenantId:string, executionRequestId:string){
    try { const rows=await db.select().from(executionRequestDryRunsTable).where(and(eq(executionRequestDryRunsTable.tenantId,tenantId),eq(executionRequestDryRunsTable.executionRequestId,executionRequestId))).orderBy(desc(executionRequestDryRunsTable.simulatedAt)).limit(1); return rows[0]??null; }
    catch(e){ if(!allowMemory()) throw new Error(`DRY_RUN_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`); return (ExecutionDryRunRepository.mem.get(this.key(tenantId,executionRequestId))??[])[0]??null; }
  }
}
