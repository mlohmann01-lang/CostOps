import { authMiddleware } from "../middleware/auth";
import { Router } from "express";
import { approvalRequestsTable, db } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { approveRequest, createApprovalRequest, getApprovalStatus, rejectRequest } from "../lib/governance/approval-workflow";
import { z } from "zod";

const ApproveBodySchema = z.object({
  actorId: z.string().min(1),
  reason: z.string().optional(),
});

const RejectBodySchema = z.object({
  actorId: z.string().min(1),
  reason: z.string().optional(),
});

const CreateApprovalBodySchema = z.object({
  tenantId: z.string().min(1),
  recommendationId: z.string().min(1),
  requestedBy: z.string().min(1),
  reason: z.string().optional(),
  riskClass: z.enum(["A", "B", "C"]).optional(),
  action: z.string().optional(),
});

const router = Router();
router.use(authMiddleware);

router.post("/", async (req, res) => {
  const parseResult = CreateApprovalBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "INVALID_REQUEST_BODY", issues: parseResult.error.issues });
    return;
  }
  const body = parseResult.data;
  return res.json(await createApprovalRequest({ ...body, reason: body.reason ?? "" }));
});

router.post("/:id/approve", async (req, res) => {
  const parseResult = ApproveBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "INVALID_REQUEST_BODY", issues: parseResult.error.issues });
    return;
  }
  const body = parseResult.data;
  try {
    return res.json(await approveRequest({ approvalRequestId: Number(req.params.id), actorId: body.actorId, reason: body.reason }));
  } catch (e: unknown) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "UNKNOWN_ERROR" });
  }
});

router.post("/:id/reject", async (req, res) => {
  const parseResult = RejectBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "INVALID_REQUEST_BODY", issues: parseResult.error.issues });
    return;
  }
  const body = parseResult.data;
  try {
    return res.json(await rejectRequest({ approvalRequestId: Number(req.params.id), actorId: body.actorId, reason: body.reason }));
  } catch (e: unknown) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "UNKNOWN_ERROR" });
  }
});

router.get("/", async (req, res) => {
  const tenantId = (req.query.tenantId as string) ?? "default";
  return res.json(await db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.tenantId, tenantId)).orderBy(desc(approvalRequestsTable.createdAt)).limit(200));
});

router.get("/recommendation/:recommendationId", async (req, res) => res.json(await getApprovalStatus(String(req.params.recommendationId))));

export default router;
