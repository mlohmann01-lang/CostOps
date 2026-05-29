import { Router } from 'express';
import { z } from 'zod';
import { ExecutionOutcomeVerificationError, ExecutionOutcomeVerificationService } from '../lib/outcomes/execution-outcome-verification-service';

const r = Router();
const service = new ExecutionOutcomeVerificationService();
const tenant = (req: any) => String(req.tenantId ?? req.__authContext?.tenantId ?? req.query.tenantId ?? req.header?.('x-tenant-id') ?? req.body?.tenantId ?? 'default');
const params = z.object({ executionResultId: z.string().min(1) });

r.get('/execution-results/:executionResultId/outcome', async (req, res) => {
  const p = params.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: 'INVALID_EXECUTION_RESULT_ID' });
  try { return res.json(await service.getLatest(tenant(req), p.data.executionResultId)); }
  catch (error) { if (error instanceof ExecutionOutcomeVerificationError) return res.status(error.status).json({ error: error.code, message: error.message }); return res.status(500).json({ error: 'OUTCOME_LOOKUP_FAILED', message: error instanceof Error ? error.message : String(error) }); }
});

r.post('/execution-results/:executionResultId/verify', async (req, res) => {
  const p = params.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: 'INVALID_EXECUTION_RESULT_ID' });
  try { return res.json(await service.verify(tenant(req), p.data.executionResultId, String(req.body?.actorId ?? 'operator'))); }
  catch (error) { if (error instanceof ExecutionOutcomeVerificationError) return res.status(error.status).json({ error: error.code, message: error.message }); return res.status(500).json({ error: 'OUTCOME_VERIFICATION_FAILED', message: error instanceof Error ? error.message : String(error) }); }
});

r.post('/execution-results/:executionResultId/drift-check', async (req, res) => {
  const p = params.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: 'INVALID_EXECUTION_RESULT_ID' });
  const out = await service.getLatest(tenant(req), p.data.executionResultId);
  if (!out.outcome) return res.status(404).json({ error: 'NOT_FOUND' });
  return res.json(out.outcome);
});

export default r;
