import {Router} from 'express';import {GovernedExecutionService,runGovernedExecutionExpansionAudit} from '../lib/governed-execution';
import {requireCapability} from '../middleware/security-guards';
import {recordAuditEvent} from '../lib/audit/audit-service.js';
import type {AuditEventType} from '@workspace/db';
const router=Router();const svc=new GovernedExecutionService();const tenant=(req:any)=>req.tenantId??req.header('x-tenant-id')??'default';
// Audit trail for the approve/execute/cancel actions on governed execution plans —
// the most sensitive action path in the system. Awaited (not fire-and-forget) so the
// record is committed before the response is sent; recordAuditEvent never throws
// (it logs and swallows internally), so this can never fail the request.
async function auditGovernedExecutionAction(req:any,eventType:AuditEventType,planId:string,outcome:'SUCCESS'|'FAILURE'|'BLOCKED',payload:Record<string,unknown> = {}){
  const auth=req.__authContext??{};
  await recordAuditEvent({tenantId:String(tenant(req)),actorId:String(auth.userId??'unknown'),actorRole:String(auth.role??'VIEWER'),eventType,resourceType:'governed_execution_plan',resourceId:planId,requestId:req.id?String(req.id):undefined,payload,outcome});
}
router.post('/plans',async(req:any,res,next)=>{try{res.json(await svc.createExecutionPlan({tenantId:tenant(req),...(req.body??{})}))}catch(e){next(e)}});
router.post('/plans/from-recommendation/:recommendationId',async(req:any,res,next)=>{try{res.json(await svc.createPlanFromRecommendation(tenant(req),req.params.recommendationId))}catch(e){next(e)}});
router.post('/plans/from-portfolio-recommendation/:portfolioRecommendationId',async(req:any,res,next)=>{try{res.json(await svc.createPlanFromPortfolioRecommendation(tenant(req),req.params.portfolioRecommendationId))}catch(e){next(e)}});
router.get('/plans',async(req:any,res,next)=>{try{res.json(await svc.repo.listPlans(tenant(req),req.query as any))}catch(e){next(e)}});
router.get('/plans/:id',async(req:any,res,next)=>{try{res.json(await svc.repo.getPlan(tenant(req),req.params.id))}catch(e){next(e)}});
router.get('/plans/:id/summary',async(req:any,res,next)=>{try{res.json(await svc.summarisePlan(tenant(req),req.params.id))}catch(e){next(e)}});
router.get('/plans/:id/steps',async(req:any,res,next)=>{try{res.json(await svc.repo.listSteps(tenant(req),{planId:req.params.id}))}catch(e){next(e)}});
router.get('/plans/:id/gates',async(req:any,res,next)=>{try{res.json(await svc.repo.listGateChecks(tenant(req),{planId:req.params.id}))}catch(e){next(e)}});
router.get('/plans/:id/dry-runs',async(req:any,res,next)=>{try{res.json(await svc.repo.listDryRuns(tenant(req),{planId:req.params.id}))}catch(e){next(e)}});
router.get('/plans/:id/runs',async(req:any,res,next)=>{try{res.json(await svc.repo.listRuns(tenant(req),{planId:req.params.id}))}catch(e){next(e)}});
router.get('/plans/:id/rollback',async(req:any,res,next)=>{try{res.json((await svc.repo.listRollbackPlans(tenant(req),{planId:req.params.id}))[0])}catch(e){next(e)}});
router.get('/plans/:id/verifications',async(req:any,res,next)=>{try{res.json(await svc.repo.listVerifications(tenant(req),{planId:req.params.id}))}catch(e){next(e)}});
router.post('/plans/:id/generate-steps',async(req:any,res,next)=>{try{res.json(await svc.generateExecutionSteps(tenant(req),req.params.id))}catch(e){next(e)}});
router.post('/plans/:id/generate-rollback',async(req:any,res,next)=>{try{res.json(await svc.generateRollbackPlan(tenant(req),req.params.id))}catch(e){next(e)}});
router.post('/plans/:id/dry-run',async(req:any,res,next)=>{try{res.json(await svc.runDryRun(tenant(req),req.params.id,req.body??{}))}catch(e){next(e)}});
router.post('/plans/:id/evaluate-gates',async(req:any,res,next)=>{try{res.json(await svc.evaluateExecutionGates(tenant(req),req.params.id,req.body??{}))}catch(e){next(e)}});
router.post('/plans/:id/submit-approval',async(req:any,res,next)=>{try{res.json(await svc.submitForApproval(tenant(req),req.params.id))}catch(e){next(e)}});
router.post('/plans/:id/approve',requireCapability('APPROVE_ACTIONS'),async(req:any,res,next)=>{const approvedBy=req.body?.approvedByUserId??req.body?.approvedBy??'approver';try{const result=await svc.markApproved(tenant(req),req.params.id,approvedBy);await auditGovernedExecutionAction(req,'APPROVAL_GRANTED',req.params.id,'SUCCESS',{approvedBy});res.json(result)}catch(e:any){await auditGovernedExecutionAction(req,'APPROVAL_GRANTED',req.params.id,'FAILURE',{approvedBy,error:String(e?.message??e)});next(e)}});
router.post('/plans/:id/execute',requireCapability('APPROVE_ACTIONS'),async(req:any,res,next)=>{try{const run=await svc.runExecution(tenant(req),req.params.id,req.body??{});await auditGovernedExecutionAction(req,run.status==='COMPLETED'?'EXECUTION_COMPLETED':'EXECUTION_FAILED',req.params.id,run.status==='COMPLETED'?'SUCCESS':'BLOCKED',{runId:run.id,status:run.status,failureReason:run.failureReason});res.json(run)}catch(e:any){await auditGovernedExecutionAction(req,'EXECUTION_FAILED',req.params.id,'FAILURE',{error:String(e?.message??e)});next(e)}});
router.post('/plans/:id/cancel',requireCapability('APPROVE_ACTIONS'),async(req:any,res,next)=>{const reason=req.body?.reason??'Cancelled';try{const result=await svc.cancelExecution(tenant(req),req.params.id,reason);await auditGovernedExecutionAction(req,'EXECUTION_CANCELLED',req.params.id,'SUCCESS',{reason});res.json(result)}catch(e:any){await auditGovernedExecutionAction(req,'EXECUTION_CANCELLED',req.params.id,'FAILURE',{reason,error:String(e?.message??e)});next(e)}});
router.post('/plans/:id/verify',async(req:any,res,next)=>{try{res.json(await svc.verifyExecution(tenant(req),req.params.id,req.body?.runId))}catch(e){next(e)}});
router.post('/snapshot/build',async(req:any,res,next)=>{try{res.json(await svc.buildExecutionSnapshot(tenant(req)))}catch(e){next(e)}});
router.get('/snapshot/latest',async(req:any,res,next)=>{try{res.json((await svc.repo.listSnapshots(tenant(req))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0])}catch(e){next(e)}});
router.get('/summary',async(req:any,res,next)=>{try{res.json(await svc.summariseTenantExecution(tenant(req)))}catch(e){next(e)}});
router.get('/audit',async(_req,res,next)=>{try{res.json(await runGovernedExecutionExpansionAudit())}catch(e){next(e)}});
export default router;
