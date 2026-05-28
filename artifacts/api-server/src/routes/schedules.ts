import { Router } from "express";
import { z } from "zod";
import { ExecutionRequestRepository } from "../lib/execution/execution-request-repository";
import { ExecutionDryRunRepository } from "../lib/execution/dry-run-repository";
import { buildSchedule } from "../lib/scheduling/change-window-engine";

const router = Router();
const reqRepo = new ExecutionRequestRepository();
const dryRepo = new ExecutionDryRunRepository();
const mem = new Map<string, any[]>();
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");

const createSchema = z.object({ campaignId:z.string().min(1), executionRequestIds:z.array(z.string().min(1)).min(1), scheduleName:z.string().min(1), changeWindowType:z.enum(["BUSINESS_HOURS","AFTER_HOURS","MAINTENANCE_WINDOW","LOW_RISK_WINDOW","MANUAL_SUPERVISION_REQUIRED"]), scheduledStart:z.string().min(1), scheduledEnd:z.string().min(1), timezone:z.string().min(1).default("UTC"), connectorHealth:z.enum(["HEALTHY","DEGRADED"]).optional(), governanceComplexity:z.number().optional() });

router.post('/', async (req,res)=>{
 const p=createSchema.safeParse(req.body??{}); if(!p.success) return res.status(400).json({error:'INVALID_SCHEDULE_REQUEST'});
 const t=tenant(req);
 const requests = (await Promise.all(p.data.executionRequestIds.map((id)=>reqRepo.getByExecutionRequestId(t,id)))).filter(Boolean) as any[];
 if (requests.length !== p.data.executionRequestIds.length) return res.status(404).json({ error: 'EXECUTION_REQUEST_NOT_FOUND' });
 const dryRuns = (await Promise.all(requests.map((r)=>dryRepo.latest(t, String(r.executionRequestId))))).filter(Boolean);
 const schedule = buildSchedule({ tenantId:t, campaignId:p.data.campaignId, executionRequests:requests, dryRuns, scheduleName:p.data.scheduleName, changeWindowType:p.data.changeWindowType, scheduledStart:p.data.scheduledStart, scheduledEnd:p.data.scheduledEnd, timezone:p.data.timezone, connectorHealth:p.data.connectorHealth, governanceComplexity:p.data.governanceComplexity });
 mem.set(t,[...(mem.get(t)??[]),schedule]);
 return res.json(schedule);
});

router.get('/', async (req,res)=> res.json(mem.get(tenant(req)) ?? []));
router.get('/:scheduleId', async (req,res)=>{ const row=(mem.get(tenant(req))??[]).find((x)=>x.scheduleId===req.params.scheduleId); if(!row) return res.status(404).json({error:'NOT_FOUND'}); return res.json(row); });
router.post('/:scheduleId/cancel', async (req,res)=>{ const t=tenant(req); const rows=mem.get(t)??[]; const idx=rows.findIndex((x)=>x.scheduleId===req.params.scheduleId); if(idx<0) return res.status(404).json({error:'NOT_FOUND'}); rows[idx]={...rows[idx], scheduleState:'CANCELLED', updatedAt:new Date().toISOString()}; mem.set(t,rows); return res.json(rows[idx]); });

export default router;
