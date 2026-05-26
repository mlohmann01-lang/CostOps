import { Router } from "express";
import { z } from "zod";
import { ExecutionDryRunService } from "../lib/execution/dry-run-service";

const router = Router();
const service = new ExecutionDryRunService();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");
const executionRequestIdParam = z.object({ executionRequestId: z.string().min(1) });

router.post("/execution-requests/:executionRequestId/dry-run", async (req, res) => {
  const p = executionRequestIdParam.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: "INVALID_EXECUTION_REQUEST_ID" });
  const row = await service.run(tenant(req), p.data.executionRequestId);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ dryRun: row });
});

router.get("/execution-requests/:executionRequestId/dry-run", async (req, res) => {
  const p = executionRequestIdParam.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: "INVALID_EXECUTION_REQUEST_ID" });
  const row = await service.getLatest(tenant(req), p.data.executionRequestId);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json(row);
});

export default router;
