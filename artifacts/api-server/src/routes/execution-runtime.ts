import { Router } from "express";
import { z } from "zod";
import { ExecutionRuntime } from "../lib/execution/execution-runtime";

const router = Router();
const runtime = new ExecutionRuntime();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");
const executionRequestIdParam = z.object({ executionRequestId: z.string().min(1) });
const executeBody = z.object({ executedBy: z.string().min(1).default("operator") });

router.post("/execution-requests/:executionRequestId/execute", async (req, res) => {
  const p = executionRequestIdParam.safeParse(req.params);
  const b = executeBody.safeParse(req.body ?? {});
  if (!p.success || !b.success) return res.status(400).json({ error: "INVALID_EXECUTION_REQUEST" });
  try {
    const row = await runtime.execute(tenant(req), p.data.executionRequestId, b.data.executedBy);
    if (!row) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({ executionRequestId: p.data.executionRequestId, executionState: row.executionState, result: row });
  } catch (error) {
    return res.status(500).json({ error: "EXECUTION_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/execution-requests/:executionRequestId/result", async (req, res) => {
  const p = executionRequestIdParam.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: "INVALID_EXECUTION_REQUEST" });
  const row = await runtime.getResult(tenant(req), p.data.executionRequestId);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json(row);
});

export default router;
