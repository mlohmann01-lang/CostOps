import { Router } from 'express';
import { buildVerdictCard, buildTimeline, buildReplay } from '../lib/economic-operations-productization';
import { EconomicOperationsIntentService, TENANT_OPERATIONAL_MODE_REGISTRY, type ExecutionIntentDto } from '../lib/economic-operations-intent-service';

const r=Router();
const svc = new EconomicOperationsIntentService();
svc.seedExecution({executionId:'exec-1',tenantId:'TENANT-US',state:'PROPOSED',approvalGranted:false,simulationReady:false,connectorReady:true,dataTrustReady:true,rollbackEligible:false,tenantExecutionMode:'ENFORCED',tenantMode:'PILOT_READ_ONLY',proofIds:['p1'],ledgerEntryId:'ledger-exec-1',fixtureBacked:false});

r.get('/command-center',(req,res)=>res.json({cards:[buildVerdictCard(String(req.query.tenantId??'default'),'M365','Inactive User Reclaim','APPROVAL_REQUIRED')],tenantMode:'PILOT_READ_ONLY',modeBanner:TENANT_OPERATIONAL_MODE_REGISTRY.PILOT_READ_ONLY.uiBanner}));
r.get('/timeline/:id',(req,res)=>res.json(buildTimeline(req.params.id)));
r.post('/intent',(req,res)=>{ const env=(process.env.NODE_ENV==='production'?'production':'development'); res.json(svc.submitIntent(req.body as ExecutionIntentDto, env)); });
r.get('/actions/:executionId',(req,res)=>res.json({executionId:req.params.executionId,actions:svc.getActions(String(req.query.tenantId??''),req.params.executionId)}));
r.get('/proof/:executionId',(req,res)=>res.json(svc.getProofGraph(String(req.query.tenantId??''),req.params.executionId) ?? {executionId:req.params.executionId,status:'PROOF_INCOMPLETE',nodes:[]}));
r.get('/outcomes/:executionId',(req,res)=>res.json(svc.getOutcome(String(req.query.tenantId??''),req.params.executionId) ?? {executionId:req.params.executionId,status:'NOT_FOUND'}));
r.get('/rollback/:id',(req,res)=>res.json({executionId:req.params.id,rollbackAvailable:true,rollbackWindow:'24h',rollbackComplexity:'MEDIUM',providerRollbackSuccessCalibration:0.74,dependencyRollbackChain:['step3','step2','step1'],blockers:[],requiredApprovals:['DIRECTOR'],blastRadiusDelta:'REDUCE',rollbackSimulationResult:'SAFE'}));
r.get('/replay/:id',(req,res)=>res.json(buildReplay(req.params.id)));
export default r;
