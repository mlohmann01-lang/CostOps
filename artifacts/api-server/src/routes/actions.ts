import { Router } from "express";
import { z } from "zod";
import {
  GovernedActionTransitionError,
  attachOutcomeToAction,
  createGovernedActionFromRecommendation,
  getActionEvidenceSummary,
  governedActionService,
  transitionGovernedAction,
  type GovernedActionStatus,
} from "../lib/actions/governed-actions";

const router = Router();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");

const domainSchema = z.enum(["M365", "AI", "SAAS", "CLOUD", "ITAM", "DATA", "OTHER"]);
const sourceTypeSchema = z.enum(["OPPORTUNITY", "RECOMMENDATION", "GOVERNANCE_FINDING", "DRIFT_EVENT", "MANUAL"]);
const statusSchema = z.enum(["DISCOVERED", "PRIORITISED", "READY", "AWAITING_APPROVAL", "APPROVED", "QUEUED", "EXECUTING", "EXECUTED", "VERIFYING", "VERIFIED", "RETAINED", "DRIFTED", "CLOSED", "CANCELLED", "REJECTED"]);
const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const readinessSchema = z.enum(["ELIGIBLE", "APPROVAL_REQUIRED", "BLOCKED"]);
const blastRadiusSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
const rollbackCapabilitySchema = z.enum(["FULL", "PARTIAL", "NONE"]);

const actionBodySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  domain: domainSchema.default("OTHER"),
  sourceType: sourceTypeSchema.default("MANUAL"),
  sourceId: z.string().min(1),
  ownerId: z.string().optional(),
  approverId: z.string().optional(),
  status: statusSchema.default("DISCOVERED"),
  priority: prioritySchema.default("MEDIUM"),
  readiness: readinessSchema.default("APPROVAL_REQUIRED"),
  trustScore: z.number().optional(),
  projectedMonthlyValue: z.number().optional(),
  projectedAnnualValue: z.number().optional(),
  actualMonthlyValue: z.number().optional(),
  actualAnnualValue: z.number().optional(),
  blastRadius: blastRadiusSchema.default("LOW"),
  rollbackCapability: rollbackCapabilitySchema.default("PARTIAL"),
  recommendationIds: z.array(z.string()).default([]),
  evidenceIds: z.array(z.string()).default([]),
  outcomeIds: z.array(z.string()).default([]),
});

const transitionBodySchema = z.object({ targetStatus: statusSchema, actor: z.string().optional(), notes: z.string().optional() });
const recommendationBodySchema = z.object({ recommendation: z.record(z.string(), z.unknown()), overrides: z.record(z.string(), z.unknown()).optional() });
const outcomeBodySchema = z.object({ outcome: z.record(z.string(), z.unknown()), actor: z.string().optional(), notes: z.string().optional() });

router.get("/dashboard", async (req, res) => res.json(await governedActionService.dashboard(tenant(req))));

router.get("/", async (req, res) => res.json(await governedActionService.list(tenant(req))));

router.get("/:id", async (req, res) => {
  const action = await governedActionService.get(tenant(req), req.params.id);
  if (!action) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json(action);
});

router.post("/", async (req, res) => {
  const parsed = actionBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "INVALID_GOVERNED_ACTION", details: parsed.error.flatten() });
  const action = await governedActionService.create({ ...parsed.data, tenantId: tenant(req) });
  return res.status(201).json(action);
});

router.post("/from-recommendation", async (req, res) => {
  const parsed = recommendationBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "INVALID_RECOMMENDATION_ACTION_REQUEST", details: parsed.error.flatten() });
  const action = await createGovernedActionFromRecommendation(parsed.data.recommendation, { ...(parsed.data.overrides as any), tenantId: tenant(req) });
  return res.status(201).json(action);
});

router.post("/:id/transition", async (req, res) => {
  const parsed = transitionBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "INVALID_TRANSITION_REQUEST", details: parsed.error.flatten() });
  try {
    const action = await transitionGovernedAction(req.params.id, parsed.data.targetStatus as GovernedActionStatus, { tenantId: tenant(req), actor: parsed.data.actor, notes: parsed.data.notes });
    if (!action) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json(action);
  } catch (error) {
    if (error instanceof GovernedActionTransitionError) return res.status(409).json({ error: "INVALID_TRANSITION", message: error.message, from: error.from, to: error.to });
    throw error;
  }
});

router.post("/:id/outcomes", async (req, res) => {
  const parsed = outcomeBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "INVALID_OUTCOME_ATTACHMENT", details: parsed.error.flatten() });
  const action = await attachOutcomeToAction(req.params.id, parsed.data.outcome, { tenantId: tenant(req), actor: parsed.data.actor, notes: parsed.data.notes });
  if (!action) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json(action);
});

router.get("/:id/evidence", async (req, res) => {
  const summary = await getActionEvidenceSummary(tenant(req), req.params.id);
  if (!summary) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json(summary);
});

router.get("/:id/history", async (req, res) => res.json(await governedActionService.history(tenant(req), req.params.id)));

export default router;
