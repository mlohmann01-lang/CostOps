import { and, desc, eq, lte } from "drizzle-orm";
import { approvalDecisionsTable, db, operatorActivityEventsTable, policyExceptionsTable, workflowAssignmentsTable, workflowItemsTable } from "@workspace/db";
import { emitM365Event } from "../observability/operational-telemetry-service";

export class WorkflowOperationsService {
  calcSlaStatus(createdAt: Date, dueAt?: Date | null, now = new Date()): "HEALTHY"|"WARNING"|"BREACHED" {
    if (!dueAt) return "HEALTHY";
    if (now.getTime() > dueAt.getTime()) return "BREACHED";
    const window = dueAt.getTime() - createdAt.getTime();
    const remaining = dueAt.getTime() - now.getTime();
    return remaining <= window * 0.25 ? "WARNING" : "HEALTHY";
  }
  async emitOperatorEvent(tenantId: string, operatorId: string, activityType: string, targetType: string, targetId: string, activityMetadata: Record<string, unknown> = {}) {
    return db.insert(operatorActivityEventsTable).values({ tenantId, operatorId, activityType, targetType, targetId, activityMetadata }).returning();
  }
  async createWorkflowItem(input: any) {
    const now = new Date();
    const dueAt = input.dueAt ? new Date(input.dueAt) : null;
    const [row] = await db.insert(workflowItemsTable).values({ ...input, dueAt, slaStatus: this.calcSlaStatus(now, dueAt), createdAt: now, updatedAt: now }).returning();
    await this.emitOperatorEvent(input.tenantId, input.createdBy ?? "system", "WORKFLOW_ITEM_CREATED", "workflow_item", String(row.id), { workflowType: row.workflowType });
    await emitM365Event("M365_WORKFLOW_REVIEW_CREATED", { tenantId: input.tenantId, workflowId: String(row.id), recommendationId: String(input.recommendationId ?? ""), correlationId: String(input.correlationId ?? `wf:${row.id}`), severity: "LOW" });
    return row;
  }
  async assignWorkflowItem(tenantId: string, workflowItemId: string, payload: any) {
    const [row] = await db.insert(workflowAssignmentsTable).values({ tenantId, workflowItemId, assigneeId: payload.assigneeId, assignedBy: payload.assignedBy, assignmentReason: payload.assignmentReason }).returning();
    await db.update(workflowItemsTable).set({ status: "ASSIGNED", updatedAt: new Date() }).where(and(eq(workflowItemsTable.tenantId, tenantId), eq(workflowItemsTable.id, Number(workflowItemId))));
    await this.emitOperatorEvent(tenantId, payload.assignedBy, "WORKFLOW_ASSIGNED", "workflow_item", workflowItemId, { assigneeId: payload.assigneeId });
    await emitM365Event("M365_WORKFLOW_ESCALATED", { tenantId, workflowId: workflowItemId, recommendationId: String(payload.recommendationId ?? ""), correlationId: String(payload.correlationId ?? `wf-assign:${workflowItemId}`), severity: "MEDIUM" });
    return row;
  }
  async submitDecision(tenantId: string, workflowItemId: string, payload: any) { const [row] = await db.insert(approvalDecisionsTable).values({ tenantId, workflowItemId, targetType: payload.targetType, targetId: payload.targetId, decision: payload.decision, decisionReason: payload.decisionReason, decidedBy: payload.decidedBy, decisionEvidence: payload.decisionEvidence ?? {} }).returning(); await this.emitOperatorEvent(tenantId, payload.decidedBy, "WORKFLOW_DECISION_SUBMITTED", "workflow_item", workflowItemId, { decision: payload.decision }); return row; }
  async createPolicyException(input: any) { const [row] = await db.insert(policyExceptionsTable).values({ ...input, expiryAt: new Date(input.expiryAt) }).returning(); await this.emitOperatorEvent(input.tenantId, input.requestedBy ?? "system", "POLICY_EXCEPTION_REQUESTED", "policy_exception", String(row.id), { policyId: input.policyId, policyVersion: input.policyVersion }); return row; }
  async setPolicyExceptionStatus(tenantId: string, id: string, status: "APPROVED"|"REJECTED"|"REVOKED", actorId: string) { const [row] = await db.update(policyExceptionsTable).set({ exceptionStatus: status, approvedBy: status === "APPROVED" ? actorId : null, approvedAt: status === "APPROVED" ? new Date() : null }).where(and(eq(policyExceptionsTable.tenantId, tenantId), eq(policyExceptionsTable.id, Number(id)))).returning(); await this.emitOperatorEvent(tenantId, actorId, `POLICY_EXCEPTION_${status}`, "policy_exception", id); return row; }
  async expireExceptions(tenantId: string) { const now = new Date(); const rows = await db.select().from(policyExceptionsTable).where(and(eq(policyExceptionsTable.tenantId, tenantId), lte(policyExceptionsTable.expiryAt, now), eq(policyExceptionsTable.exceptionStatus, "APPROVED"))); for (const r of rows) { await db.update(policyExceptionsTable).set({ exceptionStatus: "EXPIRED" }).where(eq(policyExceptionsTable.id, r.id)); await this.emitOperatorEvent(tenantId, "system", "POLICY_EXCEPTION_EXPIRED", "policy_exception", String(r.id)); } return rows.length; }
  async evaluateSlaBreaches(tenantId: string, now = new Date()) {
    const rows = await db.select().from(workflowItemsTable).where(eq(workflowItemsTable.tenantId, tenantId));
    let breached = 0;
    for (const r of rows as any[]) {
      if (!r.dueAt) continue;
      if (new Date(r.dueAt).getTime() <= now.getTime() && r.slaStatus !== "BREACHED") {
        breached += 1;
        await db.update(workflowItemsTable).set({ slaStatus: "BREACHED", updatedAt: new Date(), status: r.status === "RESOLVED" ? r.status : "ESCALATED" }).where(and(eq(workflowItemsTable.tenantId, tenantId), eq(workflowItemsTable.id, r.id)));
        await this.emitOperatorEvent(tenantId, "system", "WORKFLOW_SLA_BREACHED", "workflow_item", String(r.id), { escalationReason: "DUE_AT_EXPIRED", priority: r.priorityBand });
        await emitM365Event("M365_WORKFLOW_SLA_BREACHED", { tenantId, workflowId: String(r.id), recommendationId: String(r.recommendationId ?? ""), severity: ["HIGH","CRITICAL"].includes(String(r.priorityBand)) ? "HIGH" : "MEDIUM", sourceComponent: "WorkflowOperationsService", decisionStage: "WORKFLOW", lifecycleState: "WORKFLOW_REVIEW" });
      }
    }
    return { breached };
  }

  async getEscalationHistory(tenantId: string, workflowId: string) {
    return db.select().from(operatorActivityEventsTable).where(and(eq(operatorActivityEventsTable.tenantId, tenantId), eq(operatorActivityEventsTable.targetType, "workflow_item"), eq(operatorActivityEventsTable.targetId, workflowId))).orderBy(desc(operatorActivityEventsTable.createdAt));
  }
}
export const workflowOperationsService = new WorkflowOperationsService();
