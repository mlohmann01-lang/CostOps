import { authMiddleware } from "../middleware/auth";
import { Router } from "express";
import { db, executionApprovalsTable, executionGovernancePoliciesTable, governanceExceptionsTable, policyEvaluationsTable, governancePolicyEngineTable, governancePolicyEvaluationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { ExecutionApprovalService } from "../lib/governance/execution-approval-service";
import { GovernancePolicyEngine } from "../lib/governance/governance-policy-engine";

const router = Router();
const approvals = new ExecutionApprovalService();
const policyEngine = new GovernancePolicyEngine();
router.use(authMiddleware);
router.get("/policies", async (req,res)=>{ const tenantId=(req.query.tenantId as string) ?? "default"; return res.json(await db.select().from(executionGovernancePoliciesTable).where(eq(executionGovernancePoliciesTable.tenantId,tenantId)).orderBy(desc(executionGovernancePoliciesTable.updatedAt))); });
router.post("/policies", async (req,res)=>{ const [row]=await db.insert(executionGovernancePoliciesTable).values({ ...req.body, tenantId:req.body?.tenantId ?? "default", createdBy:(req as any).user?.sub ?? "system", updatedBy:(req as any).user?.sub ?? "system" }).returning(); return res.json(row); });
router.patch("/policies/:id", async (req,res)=>{ const [row]=await db.update(executionGovernancePoliciesTable).set({ ...req.body, updatedBy:(req as any).user?.sub ?? "system", updatedAt:new Date() }).where(eq(executionGovernancePoliciesTable.id, Number(req.params.id))).returning(); return res.json(row); });
router.get("/approvals", async (req,res)=>{ const tenantId=(req.query.tenantId as string) ?? "default"; return res.json(await db.select().from(executionApprovalsTable).where(eq(executionApprovalsTable.tenantId,tenantId)).orderBy(desc(executionApprovalsTable.createdAt))); });
router.get("/approvals/:id", async (req,res)=>{ const tenantId=(req.query.tenantId as string) ?? "default"; const [row]=await db.select().from(executionApprovalsTable).where(and(eq(executionApprovalsTable.tenantId,tenantId),eq(executionApprovalsTable.id,Number(req.params.id)))).limit(1); return res.json(row ?? null); });
router.post("/approvals/:id/approve", async (req,res)=>res.json(await approvals.approve(Number(req.params.id), (req as any).user?.sub ?? "unknown", req.body?.approvalEvidence ?? {})));
router.post("/approvals/:id/reject", async (req,res)=>res.json(await approvals.reject(Number(req.params.id), (req as any).user?.sub ?? "unknown", req.body?.reason)));

router.post("/policies", async (req,res)=>{
  const row = await policyEngine.createPolicy(req.body ?? {}, (req as any).user?.sub ?? "system");
  return res.json(row);
});
router.get("/policies", async (req,res)=>{
  const tenantId=(req.query.tenantId as string) ?? "default";
  return res.json(await db.select().from(governancePolicyEngineTable).where(eq(governancePolicyEngineTable.tenantId, tenantId)).orderBy(desc(governancePolicyEngineTable.createdAt)));
});
router.get("/policies/:id", async (req,res)=>{
  const [row] = await db.select().from(governancePolicyEngineTable).where(eq(governancePolicyEngineTable.id, Number(req.params.id))).limit(1);
  return res.json(row ?? null);
});
router.post("/evaluate", async (req,res)=>{
  const tenantId=(req.body?.tenantId as string) ?? "default";
  const out = await policyEngine.evaluate(tenantId, req.body?.evaluationTargetType ?? "RECOMMENDATION", String(req.body?.evaluationTargetId ?? "unknown"), req.body?.target ?? {}, { simulation: !!req.body?.simulation });
  return res.json(out);
});
router.get("/evaluations", async (req,res)=>{
  const tenantId=(req.query.tenantId as string) ?? "default";
  return res.json(await db.select().from(governancePolicyEvaluationsTable).where(eq(governancePolicyEvaluationsTable.tenantId,tenantId)).orderBy(desc(governancePolicyEvaluationsTable.createdAt)));
});

router.get("/policy-evaluations", async (req,res)=>{ const tenantId=(req.query.tenantId as string) ?? "default"; return res.json(await db.select().from(policyEvaluationsTable).where(eq(policyEvaluationsTable.tenantId,tenantId)).orderBy(desc(policyEvaluationsTable.createdAt)).limit(200)); });
router.get("/exceptions", async (req,res)=>{ const tenantId=(req.query.tenantId as string) ?? "default"; return res.json(await db.select().from(governanceExceptionsTable).where(eq(governanceExceptionsTable.tenantId,tenantId)).orderBy(desc(governanceExceptionsTable.createdAt))); });
export default router;
