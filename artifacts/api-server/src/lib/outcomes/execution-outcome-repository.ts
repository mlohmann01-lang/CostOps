import { and, desc, eq } from 'drizzle-orm'
import { db, executionOutcomesTable, outcomeLedgerTable } from '@workspace/db'

function allowMemory(){ const e=String(process.env.RUNTIME_ENV??process.env.NODE_ENV??'development').toLowerCase(); return e==='test'||e==='development'; }

export class ExecutionOutcomeRepository {
  private static mem = new Map<string, any[]>();
  private key(t:string,r:string){ return `${t}:${r}`; }

  async upsert(row: typeof executionOutcomesTable.$inferInsert & { recommendationId?: string | null }) {
    try {
      const existing = await this.latest(row.tenantId, row.executionResultId)
      if (existing) {
        const [updated] = await db.update(executionOutcomesTable).set(row as any).where(eq(executionOutcomesTable.id, (existing as any).id)).returning()
        await this.upsertLedger(updated ?? row)
        return updated ?? row
      }
      const [saved] = await db.insert(executionOutcomesTable).values(row as any).returning()
      await this.upsertLedger(saved)
      return saved
    } catch(e) {
      if(!allowMemory()) throw new Error(`EXECUTION_OUTCOME_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`)
      const k=this.key(row.tenantId,row.executionResultId); const arr=ExecutionOutcomeRepository.mem.get(k)??[]; const saved={id:Date.now(),createdAt:new Date(),...row}; arr.unshift(saved); ExecutionOutcomeRepository.mem.set(k,arr); return saved
    }
  }

  async latest(tenantId:string, executionResultId:string) {
    try { const rows=await db.select().from(executionOutcomesTable).where(and(eq(executionOutcomesTable.tenantId,tenantId),eq(executionOutcomesTable.executionResultId,executionResultId))).orderBy(desc(executionOutcomesTable.lastCheckedAt)).limit(1); return rows[0]??null; }
    catch(e){ if(!allowMemory()) throw new Error(`EXECUTION_OUTCOME_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`); return (ExecutionOutcomeRepository.mem.get(this.key(tenantId,executionResultId))??[])[0]??null; }
  }

  private async upsertLedger(outcome: any) {
    try {
      const evidence = { verificationState: outcome.verificationState, verifiedSaving: outcome.verifiedMonthlySavings, outcomeId: outcome.outcomeId, executionResultId: outcome.executionResultId, sourceOfTruth: 'EXECUTION_OUTCOME', proofReferences: [`execution-outcome:${outcome.outcomeId}`], verificationEvidence: outcome.verificationEvidence }
      const row = { tenantId: outcome.tenantId, recommendationId: Number(String(outcome.recommendationId ?? '').replace(/\D/g,'')) || 0, executionResultId: outcome.executionResultId, userEmail: String((outcome.verificationEvidence as any)?.userId ?? ''), displayName: String((outcome.verificationEvidence as any)?.userId ?? 'Execution outcome'), action: 'REMOVE_LICENSE', licenceSku: String(((outcome.verificationEvidence as any)?.removedSkuIds ?? [])[0] ?? ''), monthlySaving: Number(outcome.projectedMonthlySavings ?? 0), annualisedSaving: Number(outcome.projectedAnnualSavings ?? 0), executionMode: 'LIVE_GOVERNED', executed: true, executionStatus: String(outcome.verificationState), evidence, executedAt: outcome.verifiedAt ?? outcome.lastCheckedAt ?? new Date() } as any
      await db.insert(outcomeLedgerTable).values(row)
    } catch (e) { if(!allowMemory()) throw e }
  }
}
