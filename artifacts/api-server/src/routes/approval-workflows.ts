import { Router } from 'express';
import { z } from 'zod';
import { delegateWorkflow } from '../lib/approvals/approval-workflow-engine';
import { appendUnifiedEvent } from '../lib/events/evidence-timeline';
import { normalizeApprovalWorkflowEvent } from '../lib/events/event-normalizer';
import { getApprovalWorkflow, listApprovalWorkflows, updateApprovalWorkflow } from '../lib/approvals/approval-workflow-store';
import { ApprovalAuthorityError, ApprovalAuthorityService } from '../lib/approvals/approval-authority-service';
import { RecommendationGovernanceEventRepository } from '../lib/recommendations/governance-event-repository';
import { RecommendationGovernanceEventService } from '../lib/recommendations/governance-event-service';

const router = Router();
const eventEnv = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase();
const eventRepo = (eventEnv === 'production' || eventEnv === 'staging') ? new RecommendationGovernanceEventRepository() : new RecommendationGovernanceEventRepository({ storageMode: 'memory' });
const authority = new ApprovalAuthorityService(undefined, new RecommendationGovernanceEventService(eventRepo));
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');

const createSchema = z.object({ targetType:z.enum(['RECOMMENDATION','OPPORTUNITY','CAMPAIGN','EXECUTION_REQUEST','SCHEDULE']), targetId:z.string().min(1), workflowName:z.string().min(1), riskClass:z.string().min(1), delegatedApprovalAllowed:z.boolean().optional(), separationOfDutiesRequired:z.boolean().optional() });
router.post('/', async (req,res)=>{ const p=createSchema.safeParse(req.body??{}); if(!p.success) return res.status(400).json({error:'INVALID_REQUEST'}); try { const t=tenant(req); const result=await authority.submitForApproval(t, p.data.targetType, p.data.targetId, { workflowName:p.data.workflowName, riskClass:p.data.riskClass, duplicateMode:'ERROR' }); return res.json({ ...result.workflow, canonicalApproval: result.approval, sourceSystem: result.approval.sourceSystem }); } catch(error) { if(error instanceof ApprovalAuthorityError) return res.status(error.status).json({error:error.code,message:error.message}); return res.status(500).json({error:'APPROVAL_WORKFLOW_CREATE_FAILED'}); } });
router.get('/', (_req,res)=>{ return res.json(listApprovalWorkflows(tenant(_req))); });
router.get('/:workflowId', (req,res)=>{ const row=getApprovalWorkflow(tenant(req), req.params.workflowId); if(!row) return res.status(404).json({error:'NOT_FOUND'}); return res.json({ ...row, sourceSystem:'APPROVAL_WORKFLOW' }); });
router.post('/:workflowId/approve', async (req,res)=>{ const t=tenant(req); const body=req.body??{}; try { const result=await authority.approve(t, req.params.workflowId, { actorId:String(body.actorId??'operator'), actorRoles:Array.isArray(body.actorRoles)?body.actorRoles:['OWNER'] }); return res.json(result.executionRequest ? {...result.workflow, executionRequest:result.executionRequest, canonicalApproval:result.approval, sourceSystem:result.approval.sourceSystem} : { ...result.workflow, canonicalApproval:result.approval, sourceSystem:result.approval.sourceSystem }); } catch(error) { if(error instanceof ApprovalAuthorityError) return res.status(error.status).json({error:error.code,message:error.message}); return res.status(500).json({error:'APPROVAL_WORKFLOW_APPROVE_FAILED'}); } });
router.post('/:workflowId/reject', async (req,res)=>{ const t=tenant(req); const body=req.body??{}; try { const result=await authority.reject(t, req.params.workflowId, { actorId:String(body.actorId??'operator') }, String(body.reason??'REJECTED')); return res.json({ ...result.workflow, canonicalApproval:result.approval, sourceSystem:result.approval.sourceSystem }); } catch(error) { if(error instanceof ApprovalAuthorityError) return res.status(error.status).json({error:error.code,message:error.message}); return res.status(500).json({error:'APPROVAL_WORKFLOW_REJECT_FAILED'}); } });
router.post('/:workflowId/delegate', (req,res)=>{ const t=tenant(req); const body=req.body??{}; const row=updateApprovalWorkflow(t, req.params.workflowId, (w)=>delegateWorkflow(w, String(body.actorId??'operator'), String(body.delegateTo??'delegate'), String(body.role??'OWNER'))); if(!row) return res.status(404).json({error:'NOT_FOUND'}); const ev=row.auditEvents[row.auditEvents.length-1]; if(ev) appendUnifiedEvent(normalizeApprovalWorkflowEvent({tenantId:t,workflowId:row.workflowId,...ev})); return res.json({ ...row, sourceSystem:'APPROVAL_WORKFLOW' }); });

export default router;
