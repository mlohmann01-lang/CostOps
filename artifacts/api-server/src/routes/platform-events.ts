import { Router } from "express";
import { platformEventService } from "../lib/events/platform-event-service";
const router = Router();
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');
router.get("/", async (req,res)=>res.json(await platformEventService.listEvents(tenant(req), { limit: Number(req.query.limit ?? 200) })));
export default router;
