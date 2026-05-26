import { Router } from "express";
import { z } from "zod";
import { ExecutionRequestService } from "../lib/execution/execution-request-service";
import { RecommendationGovernanceEventService } from "../lib/recommendations/governance-event-service";
import { RecommendationGovernanceEventRepository } from "../lib/recommendations/governance-event-repository";

const router = Router();
const eventRepo = (String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? "").toLowerCase() === "test")
  ? new RecommendationGovernanceEventRepository({ storageMode: "memory" })
  : new RecommendationGovernanceEventRepository();
const service = new ExecutionRequestService(undefined, new RecommendationGovernanceEventService(eventRepo));
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");

const recommendationIdParam = z.object({ recommendationId: z.string().min(1) });
const executionRequestIdParam = z.object({ executionRequestId: z.string().min(1) });
const createBody = z.object({ requestedBy: z.string().min(1).default("operator"), idempotencyKey: z.string().min(1) });

router.post("/recommendations/:recommendationId/execution-requests", async (req, res) => {
  const p = recommendationIdParam.safeParse(req.params);
  const b = createBody.safeParse(req.body ?? {});
  if (!p.success || !b.success) return res.status(400).json({ error: "INVALID_EXECUTION_REQUEST_CREATE" });
  const row = await service.create(tenant(req), p.data.recommendationId, b.data.requestedBy, b.data.idempotencyKey);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ executionRequest: row });
});

router.get("/execution-requests", async (req, res) => res.json(await service.list(tenant(req))));

router.get("/execution-requests/:executionRequestId", async (req, res) => {
  const p = executionRequestIdParam.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: "INVALID_EXECUTION_REQUEST_ID" });
  const row = await service.get(tenant(req), p.data.executionRequestId);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json(row);
});

router.post("/execution-requests/:executionRequestId/cancel", async (req, res) => {
  const p = executionRequestIdParam.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: "INVALID_EXECUTION_REQUEST_ID" });
  const row = await service.cancel(tenant(req), p.data.executionRequestId);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ executionRequest: row, cancelled: true });
});

export default router;
