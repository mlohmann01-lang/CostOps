import { Router, type IRouter } from 'express';
import { runEconomicControlChainAudit } from '../lib/economic-control-chain-audit';
const router:IRouter=Router();
router.get('/audit',async(_req,res)=>res.json(await runEconomicControlChainAudit()));
export default router;
