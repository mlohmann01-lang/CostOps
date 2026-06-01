import { authMiddleware } from "../middleware/auth";
import { Router } from "express";
import { approvalRequestsTable, db } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { ApprovalAuthorityError, ApprovalAuthorityService } from "../lib/approvals/approval-authority-service";
import { RecommendationGovernanceEventRepository } from "../lib/recommendations/governance-event-repository";
import { RecommendationGovernanceEventService } from "../lib/recommendations/governance-event-service";

const CreateApprovalBodySchema = z.object({
  tenantId: z.string().min(1),
  recommendationId: z.string().min(1),
  requestedBy: z.string().min(1),
  reason: z.string().optional(),
  riskClass: z.enum(["A", "B", "C"]).optional(),
  action: z.string().optional(),
});

const router = Router();
const eventEnv = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase();
const eventRepo = (eventEnv === "production" || eventEnv === "staging") ? new RecommendationGovernanceEventRepository() : new RecommendationGovernanceEventRepository({ storageMode: "memory" });
const authority = new ApprovalAuthorityService(undefined, new RecommendationGovernanceEventService(eventRepo));
router.use(authMiddleware);

router.post("/", async (req, res) => {
  const parseResult = CreateApprovalBodySchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: "INVALID_REQUEST_BODY", issues: parseResult.error.issues });
  const body = parseResult.data;
  try {
    const result = await authority.submitForApproval(body.tenantId, "RECOMMENDATION", body.recommendationId, { actorId: body.requestedBy, actorRole: "OPERATOR", reason: body.reason, riskClass: body.riskClass, duplicateMode: "RETURN_EXISTING" });
    return res.json({ ...result.approval, compatibility: true });
  } catch (error) {
    if (error instanceof ApprovalAuthorityError) return res.status(error.status).json({ error: error.code, message: error.message });
    return res.status(500).json({ error: "APPROVAL_COMPATIBILITY_SUBMIT_FAILED" });
  }
});

router.post("/:id/approve", (_req, res) => res.status(410).json({ error: "LEGACY_APPROVAL_MUTATION_DISABLED", message: "Legacy approval_requests are read-only compatibility projections; use /api/approval-authority/workflows/:workflowId/approve.", sourceSystem: "LEGACY_APPROVAL_REQUEST" }));
router.post("/:id/reject", (_req, res) => res.status(410).json({ error: "LEGACY_APPROVAL_MUTATION_DISABLED", message: "Legacy approval_requests are read-only compatibility projections; use /api/approval-authority/workflows/:workflowId/reject.", sourceSystem: "LEGACY_APPROVAL_REQUEST" }));

router.get("/", async (req, res) => {
  const tenantId = (req.query.tenantId as string) ?? "default";
  const legacy = await db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.tenantId, tenantId)).orderBy(desc(approvalRequestsTable.createdAt)).limit(200);
  const canonical = await authority.listApprovals(tenantId);
  return res.json({ sourceSystem: "LEGACY_APPROVAL_REQUEST", compatibility: true, approvals: canonical, legacy: legacy.map((row) => ({ ...row, sourceSystem: "LEGACY_APPROVAL_REQUEST" })) });
});

router.get("/recommendation/:recommendationId", async (req, res) => res.json(await authority.getApprovalStatus(String(req.query.tenantId ?? "default"), "RECOMMENDATION", String(req.params.recommendationId))));

export default router;
