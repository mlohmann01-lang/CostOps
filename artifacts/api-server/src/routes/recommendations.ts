import { Router } from "express";
import { z } from "zod";
import { GovernedRecommendationRepository } from "../lib/recommendations/recommendation-repository";
import { GovernedRecommendationService } from "../lib/recommendations/recommendation-service";
import { RecommendationGovernanceEventService } from "../lib/recommendations/governance-event-service";
import { RecommendationGovernanceEventRepository } from "../lib/recommendations/governance-event-repository";
import { prioritizeRecommendations } from "../lib/recommendations/opportunity-prioritizer";
import { RecommendationApprovalError, RecommendationApprovalService } from "../lib/recommendations/recommendation-approval-service";
import { RecommendationExplainabilityService } from "../lib/recommendations/recommendation-explainability-service";

import { requireTenantContext } from "../middleware/security-guards";

const router = Router();
router.use(requireTenantContext());
const repo = new GovernedRecommendationRepository();
const service = new GovernedRecommendationService(repo);
const eventEnv = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase();
const eventRepo = (eventEnv === "production" || eventEnv === "staging")
  ? new RecommendationGovernanceEventRepository()
  : new RecommendationGovernanceEventRepository({ storageMode: "memory" });
const eventService = new RecommendationGovernanceEventService(eventRepo);
const approvalService = new RecommendationApprovalService(repo, eventService);
const explainabilityService = new RecommendationExplainabilityService(repo);
const tenant = (req: any): string => String(req.tenantId);

const recommendationIdParam = z.object({ recommendationId: z.string().min(1) });
const listFilterSchema = z.object({ readiness: z.string().optional(), state: z.string().optional(), playbookId: z.string().optional() });
const blockBodySchema = z.object({ reason: z.string().min(1), blockedBy: z.string().min(1).default("operator") });
const approveBodySchema = z.object({ approvedBy: z.string().min(1).default("operator") });
const submitApprovalBodySchema = z.object({ actorId: z.string().min(1).default("operator"), actorRole: z.string().min(1).default("OPERATOR"), reason: z.string().optional() });

router.get("/", async (req, res) => {
  const filters = listFilterSchema.safeParse(req.query);
  if (!filters.success) return res.status(400).json({ error: "INVALID_FILTERS", details: filters.error.flatten() });
  const rows = await repo.list(tenant(req), filters.data);
  return res.json(rows);
});


router.get("/prioritized", async (req, res) => {
  const filters = listFilterSchema.safeParse(req.query);
  if (!filters.success) return res.status(400).json({ error: "INVALID_FILTERS", details: filters.error.flatten() });
  const rows = await repo.list(tenant(req), filters.data);
  return res.json(prioritizeRecommendations(rows));
});

router.get("/top-opportunities", async (req, res) => {
  const rows = await repo.list(tenant(req), {});
  return res.json(prioritizeRecommendations(rows).slice(0, 5));
});

router.get("/:recommendationId", async (req, res) => {
  const parsed = recommendationIdParam.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_RECOMMENDATION_ID" });
  const row = await repo.getByRecommendationId(tenant(req), parsed.data.recommendationId);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json(row);
});


router.get("/:recommendationId/explain", async (req, res) => {
  const parsed = recommendationIdParam.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_RECOMMENDATION_ID" });
  const explanation = await explainabilityService.explain(tenant(req), parsed.data.recommendationId);
  if (!explanation) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json(explanation);
});

router.get("/:recommendationId/resolution", async (req, res) => {
  const parsed = recommendationIdParam.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_RECOMMENDATION_ID" });
  const resolution = await explainabilityService.resolution(tenant(req), parsed.data.recommendationId);
  if (!resolution) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json(resolution);
});

router.post("/:recommendationId/submit-approval", async (req, res) => {
  const id = recommendationIdParam.safeParse(req.params);
  const body = submitApprovalBodySchema.safeParse(req.body ?? {});
  if (!id.success || !body.success) return res.status(400).json({ error: "INVALID_SUBMIT_APPROVAL_REQUEST" });
  try {
    const out = await approvalService.submitForApproval({ tenantId: tenant(req), recommendationId: id.data.recommendationId, actorId: body.data.actorId, actorRole: body.data.actorRole, reason: body.data.reason });
    return res.json(out);
  } catch (error) {
    if (error instanceof RecommendationApprovalError) return res.status(error.status).json({ error: error.code, message: error.message });
    return res.status(500).json({ error: "APPROVAL_SUBMISSION_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/:recommendationId/recalculate", async (req, res) => {
  const parsed = recommendationIdParam.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_RECOMMENDATION_ID" });
  const row = await service.recalculate(tenant(req), parsed.data.recommendationId);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ recommendation: row, recalculated: true });
});

router.post("/:recommendationId/block", async (req, res) => {
  const id = recommendationIdParam.safeParse(req.params);
  const body = blockBodySchema.safeParse(req.body);
  if (!id.success || !body.success) return res.status(400).json({ error: "INVALID_BLOCK_REQUEST" });
  const row = await service.block(tenant(req), id.data.recommendationId, body.data.reason, body.data.blockedBy);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ recommendation: row, blocked: true });
});

router.post("/:recommendationId/approve", async (req, res) => {
  const id = recommendationIdParam.safeParse(req.params);
  const body = approveBodySchema.safeParse(req.body ?? {});
  if (!id.success || !body.success) return res.status(400).json({ error: "INVALID_APPROVE_REQUEST" });
  const row = await service.approve(tenant(req), id.data.recommendationId, body.data.approvedBy);
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ recommendation: row, approved: true });
});

router.get("/:recommendationId/events", async (req, res) => {
  const id = recommendationIdParam.safeParse(req.params);
  if (!id.success) return res.status(400).json({ error: "INVALID_RECOMMENDATION_ID" });
  const rows = await eventService.list(tenant(req), id.data.recommendationId);
  return res.json(rows);
});

export default router;
