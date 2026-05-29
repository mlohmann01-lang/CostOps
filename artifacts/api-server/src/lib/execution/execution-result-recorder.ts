import { and, eq } from "drizzle-orm";
import { db, executionResultsTable } from "@workspace/db";

function allowMemory(){ const e=String(process.env.RUNTIME_ENV??process.env.NODE_ENV??"development").toLowerCase(); return e==="test"||e==="development"; }

export class ExecutionResultRecorder {
  private static mem = new Map<string, any>();
  private key(t:string,r:string){return `${t}:${r}`;}
  private resultKey(t:string,id:string){return `${t}:result:${id}`;}
  async create(row: typeof executionResultsTable.$inferInsert){
    try { const [saved]=await db.insert(executionResultsTable).values(row).returning(); return saved; }
    catch(e){ if(!allowMemory()) throw new Error(`EXECUTION_RESULT_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`); const saved={id:Date.now(),createdAt:new Date(),...row}; ExecutionResultRecorder.mem.set(this.key(row.tenantId,row.executionRequestId),saved); ExecutionResultRecorder.mem.set(this.resultKey(row.tenantId,row.executionResultId),saved); return saved; }
  }
  async getByRequestId(tenantId:string, executionRequestId:string){
    try { const rows=await db.select().from(executionResultsTable).where(and(eq(executionResultsTable.tenantId,tenantId),eq(executionResultsTable.executionRequestId,executionRequestId))).limit(1); return rows[0]??null; }
    catch(e){ if(!allowMemory()) throw new Error(`EXECUTION_RESULT_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`); return ExecutionResultRecorder.mem.get(this.key(tenantId,executionRequestId))??null; }
  }
  async getByResultId(tenantId:string, executionResultId:string){
    try { const rows=await db.select().from(executionResultsTable).where(and(eq(executionResultsTable.tenantId,tenantId),eq(executionResultsTable.executionResultId,executionResultId))).limit(1); return rows[0]??null; }
    catch(e){ if(!allowMemory()) throw new Error(`EXECUTION_RESULT_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`); return ExecutionResultRecorder.mem.get(this.resultKey(tenantId,executionResultId))??null; }
  }
}

export async function getExecutionResultById(tenantId:string, executionResultId:string){ return new ExecutionResultRecorder().getByResultId(tenantId, executionResultId); }
