import { db, executionApprovalsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { emitPlatformEvent } from "../observability/platform-events";
import { PrincipalAuthorityService } from "../principal-authority-service";
import { EvidenceRegistryV2Service } from "../evidence-registry-v2-service";
import { approvalTamperHash } from "../security/security-controls";

// Program 14B-R: tamper-evidence hash over an approval row's deterministic
// decision fields, recomputed on every state transition so any out-of-band
// row mutation produces a hash mismatch against what was last computed here.
function deterministicApprovalFields(r: any) {
  return {
    tenantId: r.tenantId,
    entityType: r.entityType,
    entityId: r.entityId,
    approvalType: r.approvalType,
    requiredApprovals: r.requiredApprovals,
    currentApprovals: r.currentApprovals,
    approvalStatus: r.approvalStatus,
    requestedBy: r.requestedBy,
    approvedBy: r.approvedBy,
    rejectedBy: r.rejectedBy,
    approvalEvidence: r.approvalEvidence,
  };
}

export class ExecutionApprovalService {
  private principals = new PrincipalAuthorityService();
  private evidenceRegistry = new EvidenceRegistryV2Service();
  requestApproval(input:any){ const withStatus={ ...input, approvalStatus: "PENDING" }; const tamperHash=approvalTamperHash(deterministicApprovalFields(withStatus)); return db.insert(executionApprovalsTable).values({ ...withStatus, tamperHash }).returning().then(async ([r])=>{ const requester = await this.principals.resolvePrincipal({ tenantId: r.tenantId, email: r.requestedBy, displayName: r.requestedBy }); if (requester) await this.principals.recordActionEvent({ tenantId: r.tenantId, principalId: requester.id, actionContextType: "APPROVAL", actionContextId: String(r.id), role: "REQUESTED", metadata: { rawIdentity: r.requestedBy } }); const ev = await this.evidenceRegistry.createEvidenceItem({ tenantId: r.tenantId, evidenceType: "APPROVAL", sourceSystem: "CERTEN", sourceEntityType: "execution_approvals", sourceEntityId: String(r.id), collectedByPrincipalId: requester?.id, payload: r }); await this.evidenceRegistry.linkEvidenceToEntity({ tenantId: r.tenantId, evidenceItemId: ev.id, linkedEntityType: "APPROVAL", linkedEntityId: String(r.id), relationshipType: "AUDIT_TRAIL" }); await emitPlatformEvent({ tenantId:r.tenantId,eventType:"EXECUTION_APPROVAL_REQUESTED",severity:"INFO",source:"governance-approval",correlationId:`approval:${r.id}`,entityType:r.entityType,entityId:r.entityId,message:"Approval requested",evidence:r }); return r; }); }
  async approve(id:number, actorId:string, evidence:any={}){ const [r]=await db.select().from(executionApprovalsTable).where(eq(executionApprovalsTable.id,id)).limit(1); if(!r) throw new Error("APPROVAL_NOT_FOUND");
    const approver = await this.principals.resolvePrincipal({ tenantId: r.tenantId, email: actorId, displayName: actorId });
    const approvedBy=[...(r.approvedBy as any[]),actorId]; const current=approvedBy.length; const status=current>=r.requiredApprovals?"APPROVED":"PENDING";
    const next={ ...r, approvedBy, currentApprovals:current, approvalStatus:status, approvalEvidence:{...(r.approvalEvidence as any),...evidence}};
    const tamperHash=approvalTamperHash(deterministicApprovalFields(next));
    const [u]=await db.update(executionApprovalsTable).set({ approvedBy, currentApprovals:current, approvalStatus:status, approvalEvidence:next.approvalEvidence, tamperHash}).where(eq(executionApprovalsTable.id,id)).returning();
    if (approver) await this.principals.recordActionEvent({ tenantId: u.tenantId, principalId: approver.id, actionContextType: "APPROVAL", actionContextId: String(u.id), role: "APPROVED", metadata: { rawIdentity: actorId } }); const ev = await this.evidenceRegistry.createEvidenceItem({ tenantId: u.tenantId, evidenceType: "APPROVAL", sourceSystem: "CERTEN", sourceEntityType: "execution_approvals", sourceEntityId: String(u.id), collectedByPrincipalId: approver?.id, payload: { approval: u, evidence } }); await this.evidenceRegistry.linkEvidenceToEntity({ tenantId: u.tenantId, evidenceItemId: ev.id, linkedEntityType: "APPROVAL", linkedEntityId: String(u.id), relationshipType: "PROVES" });
    await emitPlatformEvent({ tenantId:u.tenantId,eventType:"EXECUTION_APPROVAL_UPDATED",severity:"INFO",source:"governance-approval",correlationId:`approval:${u.id}`,entityType:u.entityType,entityId:u.entityId,message:"Approval updated",evidence:u }); return u; }
  async reject(id:number, actorId:string, reason?:string){ const [r]=await db.select().from(executionApprovalsTable).where(eq(executionApprovalsTable.id,id)).limit(1); if(!r) throw new Error("APPROVAL_NOT_FOUND");
    const rejectedBy=[...(r.rejectedBy as any[]),actorId]; const approvalEvidence={...(r.approvalEvidence as any),reason};
    const next={ ...r, rejectedBy, approvalStatus:"REJECTED", approvalEvidence };
    const tamperHash=approvalTamperHash(deterministicApprovalFields(next));
    const [u]=await db.update(executionApprovalsTable).set({ rejectedBy, approvalStatus:"REJECTED", approvalEvidence, tamperHash}).where(eq(executionApprovalsTable.id,id)).returning();
    await emitPlatformEvent({ tenantId:u.tenantId,eventType:"EXECUTION_APPROVAL_REJECTED",severity:"WARNING",source:"governance-approval",correlationId:`approval:${u.id}`,entityType:u.entityType,entityId:u.entityId,message:"Approval rejected",evidence:u }); return u; }
  async expire(id:number){ const [r]=await db.select().from(executionApprovalsTable).where(eq(executionApprovalsTable.id,id)).limit(1); if(!r) return undefined;
    const next={ ...r, approvalStatus:"EXPIRED" };
    const tamperHash=approvalTamperHash(deterministicApprovalFields(next));
    const [u]=await db.update(executionApprovalsTable).set({ approvalStatus:"EXPIRED", tamperHash }).where(and(eq(executionApprovalsTable.id,id),eq(executionApprovalsTable.approvalStatus,"PENDING"))).returning(); return u; }
  getApprovalStatus(id:number){ return db.select().from(executionApprovalsTable).where(eq(executionApprovalsTable.id,id)).orderBy(desc(executionApprovalsTable.updatedAt)).limit(1).then((r)=>r[0] ?? null); }
  // Program 14B-R: verify a stored approval row's tamperHash still matches
  // its deterministic fields — returns false if the row was altered outside
  // this service (e.g. direct DB write) since the hash was last computed.
  verifyTamperHash(r: { tamperHash: string } & Record<string, unknown>): boolean {
    return approvalTamperHash(deterministicApprovalFields(r)) === r.tamperHash;
  }
}
