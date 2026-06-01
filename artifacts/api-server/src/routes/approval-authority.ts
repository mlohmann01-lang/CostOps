import { Router } from 'express';
import { z } from 'zod';
import { ApprovalAuthorityError, ApprovalAuthorityService } from '../lib/approvals/approval-authority-service';
import { RecommendationGovernanceEventRepository } from '../lib/recommendations/governance-event-repository';
import { RecommendationGovernanceEventService } from '../lib/recommendations/governance-event-service';
import type { ApprovalAuthorityTargetType } from '../lib/approvals/approval-authority-types';

const router = Router();
const eventEnv = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase();
const eventRepo = (eventEnv === 'production' || eventEnv === 'staging') ? new RecommendationGovernanceEventRepository() : new RecommendationGovernanceEventRepository({ storageMode: 'memory' });
const authority = new ApprovalAuthorityService(undefined, new RecommendationGovernanceEventService(eventRepo));
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');
const targetParam = z.object({ targetType:z.enum(['RECOMMENDATION','OPPORTUNITY','EXECUTION_REQUEST','SCHEDULE','CAMPAIGN']), targetId:z.string().min(1) });

router.get('/', async (req,res)=>res.json({ tenantId: tenant(req), approvals: await authority.listApprovals(tenant(req), req.query.targetType ? { targetType: String(req.query.targetType).toUpperCase() as ApprovalAuthorityTargetType } : {}) }));
router.get('/:targetType/:targetId', async (req,res)=>{ const parsed=targetParam.safeParse({ targetType:String(req.params.targetType).toUpperCase(), targetId:req.params.targetId }); if(!parsed.success) return res.status(400).json({error:'INVALID_TARGET'}); return res.json(await authority.getApprovalStatus(tenant(req), parsed.data.targetType, parsed.data.targetId)); });
router.post('/:targetType/:targetId/submit', async (req,res)=>{ const parsed=targetParam.safeParse({ targetType:String(req.params.targetType).toUpperCase(), targetId:req.params.targetId }); if(!parsed.success) return res.status(400).json({error:'INVALID_TARGET'}); try { const result=await authority.submitForApproval(tenant(req), parsed.data.targetType, parsed.data.targetId, { ...(req.body??{}), duplicateMode:'ERROR' }); return res.status(result.existing ? 200 : 201).json(result.approval); } catch(error) { if(error instanceof ApprovalAuthorityError) return res.status(error.status).json({error:error.code,message:error.message}); return res.status(500).json({error:'APPROVAL_AUTHORITY_SUBMIT_FAILED'}); } });
router.post('/workflows/:workflowId/approve', async (req,res)=>{ try { const result=await authority.approve(tenant(req), req.params.workflowId, req.body??{}); return res.json(result.executionRequest ? { ...result.approval, executionRequest: result.executionRequest } : result.approval); } catch(error) { if(error instanceof ApprovalAuthorityError) return res.status(error.status).json({error:error.code,message:error.message}); return res.status(500).json({error:'APPROVAL_AUTHORITY_APPROVE_FAILED'}); } });
router.post('/workflows/:workflowId/reject', async (req,res)=>{ try { const result=await authority.reject(tenant(req), req.params.workflowId, req.body??{}, String((req.body??{}).reason ?? 'REJECTED')); return res.json(result.approval); } catch(error) { if(error instanceof ApprovalAuthorityError) return res.status(error.status).json({error:error.code,message:error.message}); return res.status(500).json({error:'APPROVAL_AUTHORITY_REJECT_FAILED'}); } });

export default router;
