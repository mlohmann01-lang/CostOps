import { approvalEventsTable, approvalRequestsTable, db } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { canApprove } from "./authorization";
import { evaluateApprovalPolicy } from "./policy-engine";
import { evaluateApprovalRuntimeControls } from "../security/runtime-controls";
import { emitPlatformEvent } from "../observability/platform-events";

const EXPIRY_HOURS = 72;

export async function createApprovalRequest(input: { tenantId: string; recommendationId: string; requestedBy: string; reason: string; riskClass?: string; action?: string }) {
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);
  const policy = await evaluateApprovalPolicy({ tenantId: input.tenantId, recommendationId: input.recommendationId, actorId: input.requestedBy, riskClass: input.riskClass ?? "B", action: input.action ?? "REMOVE_LICENSE" });
  const [req] = await db.insert(approvalRequestsTable).values({ tenantId: input.tenantId, recommendationId: input.recommendationId, requestedBy: input.requestedBy, requiredApproverRole: policy.requiredApproverRole, status: "PENDING", riskClass: input.riskClass ?? "B", action: input.action ?? "REMOVE_LICENSE", reason: input.reason ?? "", expiresAt, updatedAt: new Date() }).returning();
  await db.insert(approvalEventsTable).values({ approvalRequestId: req.id, tenantId: input.tenantId, actorId: input.requestedBy, eventType: "REQUESTED", reason: input.reason ?? "", evidence: {} });
  return req;
}

export async function approveRequest(input: { approvalRequestId: number; actorId: string; reason?: string }) {
  const [req] = await db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.id, input.approvalRequestId)).limit(1);
  if (!req) throw new Error("APPROVAL_NOT_FOUND");
  if (req.requestedBy === input.actorId) throw new Error("SELF_APPROVAL_BLOCKED");
  if (new Date(req.expiresAt).getTime() < Date.now()) throw new Error("APPROVAL_EXPIRED");
  const auth = canApprove(input.actorId, req.tenantId, { actionRiskProfile: { riskClass: req.riskClass } });
  if (!auth.allowed) throw new Error(`AUTH_${auth.reason}`);
  const runtimeControl = evaluateApprovalRuntimeControls({ tenantId: req.tenantId, actorId: input.actorId, riskClass: req.riskClass, action: req.action });
  if (runtimeControl.decision === "BLOCK") throw new Error("APPROVAL_BLOCKED_BY_RUNTIME_CONTROL");
  const [updated] = await db.update(approvalRequestsTable).set({ status: "APPROVED", updatedAt: new Date() }).where(eq(approvalRequestsTable.id, req.id)).returning();
  const eventType = runtimeControl.decision === "ALLOW" ? "APPROVED" : "APPROVED_WITH_WARNING";
  await db.insert(approvalEventsTable).values({ approvalRequestId: req.id, tenantId: req.tenantId, actorId: input.actorId, eventType, reason: input.reason ?? "", evidence: { role: auth.role, runtimeControl } });
  if (runtimeControl.decision !== "ALLOW") {
    await emitPlatformEvent({ tenantId: req.tenantId, eventType: "SUSPICIOUS_APPROVAL_DETECTED", severity: "WARNING", source: "approval-workflow", correlationId: `approval:${req.id}`, entityType: "approval_request", entityId: String(req.id), message: runtimeControl.reasons.join(",") || "Suspicious approval pattern", evidence: runtimeControl.evidence });
  }
  return updated;
}

export async function rejectRequest(input: { approvalRequestId: number; actorId: string; reason?: string }) {
  const [req] = await db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.id, input.approvalRequestId)).limit(1);
  if (!req) throw new Error("APPROVAL_NOT_FOUND");
  const auth = canApprove(input.actorId, req.tenantId, { actionRiskProfile: { riskClass: req.riskClass } });
  if (!auth.allowed) throw new Error(`AUTH_${auth.reason}`);
  const [updated] = await db.update(approvalRequestsTable).set({ status: "REJECTED", updatedAt: new Date() }).where(eq(approvalRequestsTable.id, req.id)).returning();
  await db.insert(approvalEventsTable).values({ approvalRequestId: req.id, tenantId: req.tenantId, actorId: input.actorId, eventType: "REJECTED", reason: input.reason ?? "", evidence: { role: auth.role } });
  return updated;
}

export async function getApprovalStatus(recommendationId: string) {
  const [req] = await db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.recommendationId, recommendationId)).orderBy(desc(approvalRequestsTable.createdAt)).limit(1);
  if (!req) return null;
  if (req.status === "PENDING" && new Date(req.expiresAt).getTime() < Date.now()) {
    const [expired] = await db.update(approvalRequestsTable).set({ status: "EXPIRED", updatedAt: new Date() }).where(and(eq(approvalRequestsTable.id, req.id), eq(approvalRequestsTable.status, "PENDING"))).returning();
    if (expired) await db.insert(approvalEventsTable).values({ approvalRequestId: req.id, tenantId: req.tenantId, actorId: "system", eventType: "EXPIRED", reason: "Request expired", evidence: {} });
    return expired ?? req;
  }
  return req;
}
