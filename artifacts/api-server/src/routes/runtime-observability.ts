import { Router } from 'express';
import { getRuntimeHealth } from '../lib/observability/runtime-health';

const router = Router();
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');

router.get('/runtime/health', (req,res)=> res.json(getRuntimeHealth(tenant(req))));
router.get('/runtime/connectors', (req,res)=> res.json(getRuntimeHealth(tenant(req)).connectors));
router.get('/runtime/metrics', (req,res)=> res.json(getRuntimeHealth(tenant(req)).metrics));
router.get('/runtime/status', (req,res)=> res.json({ runtimeStatus: getRuntimeHealth(tenant(req)).runtimeStatus }));

export default router;
