import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { approvalDecisionsTable, db, policyExceptionsTable, workflowAssignmentsTable, workflowItemsTable } from "@workspace/db";
import { requireCapability, requireTenantContext } from "../middleware/security-guards";
import { workflowOperationsService } from "../lib/workflow/workflow-operations-service";

const router = Router();
const tenant = (req: any): string => { const raw = req.query.tenantId; return typeof raw === "string" ? raw : "default"; };

router.use(requireTenantContext());
router.get("/items", requireCapability("READ_RECOMMENDATIONS"), async (req,res)=>res.json(await db.select().from(workflowItemsTable).where(eq(workflowItemsTable.tenantId, tenant(req)))));
router.get("/items/:id", requireCapability("READ_RECOMMENDATIONS"), async (req,res)=>{ const rows=await db.select().from(workflowItemsTable).where(and(eq(workflowItemsTable.tenantId, tenant(req)), eq(workflowItemsTable.id, Number(String(req.params.id))))).limit(1); res.json(rows[0]??null);});
router.post("/items", requireCapability("REVIEW_RECOMMENDATIONS"), async (req,res)=>res.json(await workflowOperationsService.createWorkflowItem({ ...req.body, tenantId: tenant(req), createdBy: String(req.header("x-user-id") ?? "system") })));
router.post("/items/:id/assign", requireCapability("REVIEW_RECOMMENDATIONS"), async (req,res)=>res.json(await workflowOperationsService.assignWorkflowItem(tenant(req), String(req.params.id), req.body)));
router.post("/items/:id/decision", requireCapability("APPROVE_ACTIONS"), async (req,res)=>res.json(await workflowOperationsService.submitDecision(tenant(req), String(req.params.id), req.body)));
router.get("/assignments", requireCapability("READ_RECOMMENDATIONS"), async (req,res)=>res.json(await db.select().from(workflowAssignmentsTable).where(eq(workflowAssignmentsTable.tenantId, tenant(req)))));
router.post("/policy-exceptions", requireCapability("REVIEW_RECOMMENDATIONS"), async (req,res)=>res.json(await workflowOperationsService.createPolicyException({ ...req.body, tenantId: tenant(req), requestedBy: String(req.header("x-user-id") ?? "system") })));
router.get("/policy-exceptions", requireCapability("READ_AUDIT"), async (req,res)=>res.json(await db.select().from(policyExceptionsTable).where(eq(policyExceptionsTable.tenantId, tenant(req)))));
router.post("/policy-exceptions/:id/approve", requireCapability("MANAGE_POLICIES"), async (req,res)=>res.json(await workflowOperationsService.setPolicyExceptionStatus(tenant(req), String(req.params.id), "APPROVED", String(req.header("x-user-id") ?? "system"))));
router.post("/policy-exceptions/:id/reject", requireCapability("MANAGE_POLICIES"), async (req,res)=>res.json(await workflowOperationsService.setPolicyExceptionStatus(tenant(req), String(req.params.id), "REJECTED", String(req.header("x-user-id") ?? "system"))));
router.post("/policy-exceptions/:id/revoke", requireCapability("MANAGE_POLICIES"), async (req,res)=>res.json(await workflowOperationsService.setPolicyExceptionStatus(tenant(req), String(req.params.id), "REVOKED", String(req.header("x-user-id") ?? "system"))));
router.post("/expire-exceptions", requireCapability("MANAGE_POLICIES"), async (req,res)=>res.json({ expired: await workflowOperationsService.expireExceptions(tenant(req)) }));
router.get("/decisions", requireCapability("READ_AUDIT"), async (req,res)=>res.json(await db.select().from(approvalDecisionsTable).where(eq(approvalDecisionsTable.tenantId, tenant(req)))));

export default router;
