import { Router } from 'express';
import { getRecoveryState, reconcileRecovery } from '../lib/runtime/recovery-engine';

const router = Router();
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');

router.get('/runtime/recovery', (req,res)=> res.json(getRecoveryState(tenant(req))));
router.post('/runtime/recovery/reconcile', (req,res)=> res.json(reconcileRecovery(tenant(req))));

export default router;
