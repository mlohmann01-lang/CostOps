import { Router } from "express";
import { getOpportunityFactoryHealth, runOpportunityFactory } from "../lib/opportunity-factory/opportunity-factory-service";

const router = Router();
function tenantIdFrom(req: any) { return String(req.tenantId ?? req.query.tenantId ?? "default"); }

router.post("/run", async (req, res, next) => {
  try {
    const tenantId = tenantIdFrom(req);
    return res.status(201).json(await runOpportunityFactory(tenantId));
  } catch (error) { return next(error); }
});

router.get("/health", (req, res) => res.json(getOpportunityFactoryHealth(tenantIdFrom(req))));

export default router;
