import { Router } from "express";
import { ExecutivePriorityRepository } from "../lib/prioritization/executive-priority-repository";

const router = Router();
const repo = new ExecutivePriorityRepository();
function tenantIdFrom(req: any) { return String(req.tenantId ?? req.query.tenantId ?? "default"); }

router.get("/summary", (req, res) => res.json(repo.getSummary(tenantIdFrom(req))));
router.get("/top", (req, res) => res.json({ tenantId: tenantIdFrom(req), priorities: repo.listTopPriorities(tenantIdFrom(req), Number(req.query.limit ?? 5)) }));
router.get("/", (req, res) => res.json({ tenantId: tenantIdFrom(req), priorities: repo.listPriorities(tenantIdFrom(req)) }));
router.get("/:id", (req, res) => {
  const priority = repo.getPriority(tenantIdFrom(req), String(req.params.id));
  if (!priority) return res.status(404).json({ error: "EXECUTIVE_PRIORITY_NOT_FOUND" });
  return res.json(priority);
});

export default router;
