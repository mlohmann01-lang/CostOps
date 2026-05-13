import { Router } from "express";
import { db, governancePoliciesTable, policyEvaluationsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();
router.get("/policies", async (req,res)=>{ const tenantId=(req.query.tenantId as string) ?? "default"; return res.json(await db.select().from(governancePoliciesTable).where(eq(governancePoliciesTable.tenantId,tenantId)).orderBy(desc(governancePoliciesTable.priority))); });
router.post("/policies", async (req,res)=>{ const [row]=await db.insert(governancePoliciesTable).values({ ...req.body, tenantId:req.body?.tenantId ?? "default", updatedAt:new Date() }).returning(); return res.json(row); });
router.patch("/policies/:id", async (req,res)=>{ const [row]=await db.update(governancePoliciesTable).set({ ...req.body, updatedAt:new Date() }).where(eq(governancePoliciesTable.id, Number(req.params.id))).returning(); return res.json(row); });
router.get("/policy-evaluations", async (req,res)=>{ const tenantId=(req.query.tenantId as string) ?? "default"; return res.json(await db.select().from(policyEvaluationsTable).where(eq(policyEvaluationsTable.tenantId,tenantId)).orderBy(desc(policyEvaluationsTable.createdAt)).limit(200)); });
export default router;
