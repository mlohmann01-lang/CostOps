import { Router } from 'express';
import { z } from 'zod';
import { createWorkflow, approveWorkflow, rejectWorkflow, delegateWorkflow } from '../lib/approvals/approval-workflow-engine';
import { appendUnifiedEvent } from '../lib/events/evidence-timeline';
import { normalizeApprovalWorkflowEvent } from '../lib/events/event-normalizer';
import { getApprovalWorkflow, listApprovalWorkflows, saveApprovalWorkflow, updateApprovalWorkflow } from '../lib/approvals/approval-workflow-store';
import { ExecutionRequestService } from '../lib/execution/execution-request-service';
import { RecommendationGovernanceEventRepository } from '../lib/recommendations/governance-event-repository';
import { RecommendationGovernanceEventService } from '../lib/recommendations/governance-event-service';

const router = Router();
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');
const eventEnv = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase();
const executionEventRepo = (eventEnv === 'production' || eventEnv === 'staging') ? new RecommendationGovernanceEventRepository() : new RecommendationGovernanceEventRepository({ storageMode: 'memory' });
const executionRequests = new ExecutionRequestService(undefined, new RecommendationGovernanceEventService(executionEventRepo));

const createSchema = z.object({ targetType:z.enum(['RECOMMENDATION','CAMPAIGN','EXECUTION_REQUEST','SCHEDULE']), targetId:z.string().min(1), workflowName:z.string().min(1), riskClass:z.string().min(1), delegatedApprovalAllowed:z.boolean().optional(), separationOfDutiesRequired:z.boolean().optional() });
router.post('/', (req,res)=>{ const p=createSchema.safeParse(req.body??{}); if(!p.success) return res.status(400).json({error:'INVALID_REQUEST'}); const t=tenant(req); const wf=saveApprovalWorkflow(createWorkflow({ tenantId:t, ...p.data })); wf.auditEvents.forEach((e:any)=>appendUnifiedEvent(normalizeApprovalWorkflowEvent({tenantId:t,workflowId:wf.workflowId,...e}))); return res.json(wf); });
router.get('/', (req,res)=>{ return res.json(listApprovalWorkflows(tenant(req))); });
router.get('/:workflowId', (req,res)=>{ const row=getApprovalWorkflow(tenant(req), req.params.workflowId); if(!row) return res.status(404).json({error:'NOT_FOUND'}); return res.json(row); });
router.post('/:workflowId/approve', async (req,res)=>{ const t=tenant(req); const body=req.body??{}; let beforeState=''; const row=updateApprovalWorkflow(t, req.params.workflowId, (w)=>{ beforeState=w.approvalState; return approveWorkflow(w, String(body.actorId??'operator'), Array.isArray(body.actorRoles)?body.actorRoles:['OWNER']); }); if(!row) return res.status(404).json({error:'NOT_FOUND'}); const ev=row.auditEvents[row.auditEvents.length-1]; if(ev) appendUnifiedEvent(normalizeApprovalWorkflowEvent({tenantId:t,workflowId:row.workflowId,...ev})); let executionRequest=null; if(beforeState !== 'APPROVED' && row.approvalState === 'APPROVED') executionRequest = await executionRequests.createFromApprovedWorkflow(row, String(body.actorId??'operator')); return res.json(executionRequest ? {...row, executionRequest} : row); });
router.post('/:workflowId/reject', (req,res)=>{ const t=tenant(req); const body=req.body??{}; const row=updateApprovalWorkflow(t, req.params.workflowId, (w)=>rejectWorkflow(w, String(body.actorId??'operator'), String(body.reason??'REJECTED'))); if(!row) return res.status(404).json({error:'NOT_FOUND'}); const ev=row.auditEvents[row.auditEvents.length-1]; if(ev) appendUnifiedEvent(normalizeApprovalWorkflowEvent({tenantId:t,workflowId:row.workflowId,...ev})); return res.json(row); });
router.post('/:workflowId/delegate', (req,res)=>{ const t=tenant(req); const body=req.body??{}; const row=updateApprovalWorkflow(t, req.params.workflowId, (w)=>delegateWorkflow(w, String(body.actorId??'operator'), String(body.delegateTo??'delegate'), String(body.role??'OWNER'))); if(!row) return res.status(404).json({error:'NOT_FOUND'}); const ev=row.auditEvents[row.auditEvents.length-1]; if(ev) appendUnifiedEvent(normalizeApprovalWorkflowEvent({tenantId:t,workflowId:row.workflowId,...ev})); return res.json(row); });

export default router;
