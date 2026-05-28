import { Router } from 'express';
import { z } from 'zod';
import { createWorkflow, approveWorkflow, rejectWorkflow, delegateWorkflow, evaluateEscalation } from '../lib/approvals/approval-workflow-engine';
import { appendUnifiedEvent } from '../lib/events/evidence-timeline';
import { normalizeApprovalWorkflowEvent } from '../lib/events/event-normalizer';

const router = Router();
const mem = new Map<string, any[]>();
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');

const createSchema = z.object({ targetType:z.enum(['RECOMMENDATION','CAMPAIGN','EXECUTION_REQUEST','SCHEDULE']), targetId:z.string().min(1), workflowName:z.string().min(1), riskClass:z.string().min(1), delegatedApprovalAllowed:z.boolean().optional(), separationOfDutiesRequired:z.boolean().optional() });
router.post('/', (req,res)=>{ const p=createSchema.safeParse(req.body??{}); if(!p.success) return res.status(400).json({error:'INVALID_REQUEST'}); const t=tenant(req); const wf=createWorkflow({ tenantId:t, ...p.data }); mem.set(t,[...(mem.get(t)??[]),wf]); wf.auditEvents.forEach((e:any)=>appendUnifiedEvent(normalizeApprovalWorkflowEvent({tenantId:t,workflowId:wf.workflowId,...e}))); return res.json(wf); });
router.get('/', (req,res)=>{ const t=tenant(req); const rows=(mem.get(t)??[]).map((w)=>evaluateEscalation(w)); mem.set(t, rows); return res.json(rows); });
router.get('/:workflowId', (req,res)=>{ const row=(mem.get(tenant(req))??[]).find((w)=>w.workflowId===req.params.workflowId); if(!row) return res.status(404).json({error:'NOT_FOUND'}); return res.json(row); });
router.post('/:workflowId/approve', (req,res)=>{ const t=tenant(req); const body=req.body??{}; const rows=mem.get(t)??[]; const i=rows.findIndex((w)=>w.workflowId===req.params.workflowId); if(i<0) return res.status(404).json({error:'NOT_FOUND'}); rows[i]=approveWorkflow(rows[i], String(body.actorId??'operator'), Array.isArray(body.actorRoles)?body.actorRoles:['OWNER']); mem.set(t,rows); const ev=rows[i].auditEvents[rows[i].auditEvents.length-1]; if(ev) appendUnifiedEvent(normalizeApprovalWorkflowEvent({tenantId:t,workflowId:rows[i].workflowId,...ev})); return res.json(rows[i]); });
router.post('/:workflowId/reject', (req,res)=>{ const t=tenant(req); const body=req.body??{}; const rows=mem.get(t)??[]; const i=rows.findIndex((w)=>w.workflowId===req.params.workflowId); if(i<0) return res.status(404).json({error:'NOT_FOUND'}); rows[i]=rejectWorkflow(rows[i], String(body.actorId??'operator'), String(body.reason??'REJECTED')); mem.set(t,rows); const ev=rows[i].auditEvents[rows[i].auditEvents.length-1]; if(ev) appendUnifiedEvent(normalizeApprovalWorkflowEvent({tenantId:t,workflowId:rows[i].workflowId,...ev})); return res.json(rows[i]); });
router.post('/:workflowId/delegate', (req,res)=>{ const t=tenant(req); const body=req.body??{}; const rows=mem.get(t)??[]; const i=rows.findIndex((w)=>w.workflowId===req.params.workflowId); if(i<0) return res.status(404).json({error:'NOT_FOUND'}); rows[i]=delegateWorkflow(rows[i], String(body.actorId??'operator'), String(body.delegateTo??'delegate'), String(body.role??'OWNER')); mem.set(t,rows); const ev=rows[i].auditEvents[rows[i].auditEvents.length-1]; if(ev) appendUnifiedEvent(normalizeApprovalWorkflowEvent({tenantId:t,workflowId:rows[i].workflowId,...ev})); return res.json(rows[i]); });

export default router;
