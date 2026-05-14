import { authMiddleware } from "../middleware/auth";
import { Router } from "express";
import { approvalRequestsTable, db } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { approveRequest, createApprovalRequest, getApprovalStatus, rejectRequest } from "../lib/governance/approval-workflow";

const router = Router();
router.use(authMiddleware);
router.post("/", async (req, res) => res.json(await createApprovalRequest(req.body)));
router.post("/:id/approve", async (req, res) => { try { return res.json(await approveRequest({ approvalRequestId: Number(req.params.id), actorId: req.body?.actorId, reason: req.body?.reason })); } catch (e:any) { return res.status(400).json({ error: e.message }); } });
router.post("/:id/reject", async (req, res) => { try { return res.json(await rejectRequest({ approvalRequestId: Number(req.params.id), actorId: req.body?.actorId, reason: req.body?.reason })); } catch (e:any) { return res.status(400).json({ error: e.message }); } });
router.get("/", async (req, res) => { const tenantId=(req.query.tenantId as string) ?? "default"; return res.json(await db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.tenantId, tenantId)).orderBy(desc(approvalRequestsTable.createdAt)).limit(200)); });
router.get("/recommendation/:recommendationId", async (req, res) => res.json(await getApprovalStatus(String(req.params.recommendationId))));

export default router;
