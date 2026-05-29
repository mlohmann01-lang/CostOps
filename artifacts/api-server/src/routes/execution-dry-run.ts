import { Router } from "express";
import { z } from "zod";
import { ExecutionRequestDryRunError, ExecutionRequestDryRunService } from "../lib/execution/execution-request-dry-run-service";

const router = Router();
const service = new ExecutionRequestDryRunService();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");
const executionRequestIdParam = z.object({ executionRequestId: z.string().min(1) });

router.post("/execution-requests/:executionRequestId/dry-run", async (req, res) => {
  const p = executionRequestIdParam.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: "INVALID_EXECUTION_REQUEST_ID" });
  try {
    return res.json(await service.run(tenant(req), p.data.executionRequestId));
  } catch (error) {
    if (error instanceof ExecutionRequestDryRunError) return res.status(error.status).json({ error: error.code, message: error.message });
    return res.status(500).json({ error: "DRY_RUN_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/execution-requests/:executionRequestId/dry-run", async (req, res) => {
  const p = executionRequestIdParam.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: "INVALID_EXECUTION_REQUEST_ID" });
  try {
    return res.json(await service.getLatest(tenant(req), p.data.executionRequestId));
  } catch (error) {
    if (error instanceof ExecutionRequestDryRunError) return res.status(error.status).json({ error: error.code, message: error.message });
    return res.status(500).json({ error: "DRY_RUN_LOOKUP_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
