import { Router } from 'express';
import { z } from 'zod';
import { generateAuditPack, getAuditPack } from '../lib/audit/evidence-export-service';

const router = Router();
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');
const schema = z.object({ entityType:z.string().min(1), entityId:z.string().min(1), generatedBy:z.string().min(1).default('operator'), exportFormat:z.enum(['JSON','Markdown']).default('JSON'), savingsSummary:z.object({monthly:z.number(),annual:z.number()}).optional(), approvalHistory:z.array(z.any()).optional(), policyDecisions:z.array(z.any()).optional(), executionEvidence:z.array(z.any()).optional(), outcomeEvidence:z.array(z.any()).optional(), driftEvidence:z.array(z.any()).optional() });

router.post('/audit-packs', (req,res)=>{
  const p = schema.safeParse(req.body ?? {}); if(!p.success) return res.status(400).json({error:'INVALID_AUDIT_PACK_REQUEST'});
  const t=tenant(req);
  const pack = generateAuditPack({ tenantId:t, entityType:p.data.entityType, entityId:p.data.entityId, generatedBy:p.data.generatedBy, format:p.data.exportFormat, savings:p.data.savingsSummary, approvals:p.data.approvalHistory, policy:p.data.policyDecisions, execution:p.data.executionEvidence, outcomes:p.data.outcomeEvidence, drift:p.data.driftEvidence });
  return res.json(pack);
});

router.get('/audit-packs/:auditPackId', (req,res)=>{
  const row = getAuditPack(tenant(req), req.params.auditPackId);
  if(!row) return res.status(404).json({error:'NOT_FOUND'});
  return res.json(row);
});

export default router;
