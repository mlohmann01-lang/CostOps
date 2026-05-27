import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { db, executionOutcomesTable, executionResultsTable } from '@workspace/db';

const r = Router();

r.get('/execution-results/:executionResultId/outcome', async (req, res) => {
  const tenantId = String((req as any).__authContext?.tenantId ?? req.query.tenantId ?? 'default');
  const executionResultId = String(req.params.executionResultId);
  const [row] = await db.select().from(executionOutcomesTable).where(and(eq(executionOutcomesTable.tenantId, tenantId), eq(executionOutcomesTable.executionResultId, executionResultId)));
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  return res.json(row);
});

r.post('/execution-results/:executionResultId/verify', async (req, res) => {
  const tenantId = String((req as any).__authContext?.tenantId ?? req.body?.tenantId ?? 'default');
  const executionResultId = String(req.params.executionResultId);
  const [exec] = await db.select().from(executionResultsTable).where(and(eq(executionResultsTable.tenantId, tenantId), eq(executionResultsTable.executionResultId, executionResultId)));
  if (!exec) return res.status(404).json({ error: 'NOT_FOUND' });
  const patch = { verificationState: 'PENDING_VERIFICATION', lastCheckedAt: new Date() as any };
  const [row] = await db.update(executionOutcomesTable).set(patch).where(and(eq(executionOutcomesTable.tenantId, tenantId), eq(executionOutcomesTable.executionResultId, executionResultId))).returning();
  return res.json(row ?? { executionResultId, ...patch });
});

r.post('/execution-results/:executionResultId/drift-check', async (req, res) => {
  const tenantId = String((req as any).__authContext?.tenantId ?? req.body?.tenantId ?? 'default');
  const executionResultId = String(req.params.executionResultId);
  const [row] = await db.update(executionOutcomesTable).set({ lastCheckedAt: new Date() as any }).where(and(eq(executionOutcomesTable.tenantId, tenantId), eq(executionOutcomesTable.executionResultId, executionResultId))).returning();
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  return res.json(row);
});

export default r;
