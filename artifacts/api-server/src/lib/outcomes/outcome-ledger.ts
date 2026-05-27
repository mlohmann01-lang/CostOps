import { db, outcomeLedgerTable } from '@workspace/db';
import { desc, eq } from 'drizzle-orm';
import { rollupSavings } from './savings-rollup';

export async function listOutcomeLedger(tenantId: string, limit = 200) {
  const rows = await db.select().from(outcomeLedgerTable).where(eq(outcomeLedgerTable.tenantId, tenantId)).orderBy(desc(outcomeLedgerTable.createdAt)).limit(Math.min(Math.max(limit,1),500));
  return rows;
}

export async function outcomeLedgerSummary(tenantId: string) {
  const rows = await listOutcomeLedger(tenantId, 500);
  return rollupSavings(rows as any[]);
}

export async function outcomeLedgerByPlaybook(tenantId: string) {
  const rows = await listOutcomeLedger(tenantId, 500);
  const out = new Map<string, any>();
  for (const r of rows as any[]) {
    const k = String(r.playbookId || r.action || 'UNKNOWN');
    const curr = out.get(k) ?? { playbook: k, outcomes: 0, projectedMonthlySavings: 0, verifiedMonthlySavings: 0 };
    curr.outcomes += 1;
    curr.projectedMonthlySavings += Number(r.monthlySaving ?? 0);
    curr.verifiedMonthlySavings += Number((r.evidence ?? {}).verifiedSaving ?? 0);
    out.set(k, curr);
  }
  return [...out.values()];
}

export async function outcomeLedgerByState(tenantId: string) {
  const rows = await listOutcomeLedger(tenantId, 500);
  const out = new Map<string, number>();
  for (const r of rows as any[]) {
    const state = String((r.evidence ?? {}).verificationState ?? 'PENDING_VERIFICATION');
    out.set(state, (out.get(state) ?? 0) + 1);
  }
  return [...out.entries()].map(([state,count])=>({ state, count }));
}
