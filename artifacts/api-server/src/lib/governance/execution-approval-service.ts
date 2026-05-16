import { db, executionApprovalsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { emitPlatformEvent } from "../observability/platform-events";

export class ExecutionApprovalService {
  requestApproval(input:any){ return db.insert(executionApprovalsTable).values({ ...input, approvalStatus: "PENDING" }).returning().then(async ([r])=>{ await emitPlatformEvent({ tenantId:r.tenantId,eventType:"EXECUTION_APPROVAL_REQUESTED",severity:"INFO",source:"governance-approval",correlationId:`approval:${r.id}`,entityType:r.entityType,entityId:r.entityId,message:"Approval requested",evidence:r }); return r; }); }
  async approve(id:number, actorId:string, evidence:any={}){ const [r]=await db.select().from(executionApprovalsTable).where(eq(executionApprovalsTable.id,id)).limit(1); if(!r) throw new Error("APPROVAL_NOT_FOUND");
    const approvedBy=[...(r.approvedBy as any[]),actorId]; const current=approvedBy.length; const status=current>=r.requiredApprovals?"APPROVED":"PENDING";
    const [u]=await db.update(executionApprovalsTable).set({ approvedBy, currentApprovals:current, approvalStatus:status, approvalEvidence:{...(r.approvalEvidence as any),...evidence}}).where(eq(executionApprovalsTable.id,id)).returning();
    await emitPlatformEvent({ tenantId:u.tenantId,eventType:"EXECUTION_APPROVAL_UPDATED",severity:"INFO",source:"governance-approval",correlationId:`approval:${u.id}`,entityType:u.entityType,entityId:u.entityId,message:"Approval updated",evidence:u }); return u; }
  async reject(id:number, actorId:string, reason?:string){ const [r]=await db.select().from(executionApprovalsTable).where(eq(executionApprovalsTable.id,id)).limit(1); if(!r) throw new Error("APPROVAL_NOT_FOUND");
    const [u]=await db.update(executionApprovalsTable).set({ rejectedBy:[...(r.rejectedBy as any[]),actorId], approvalStatus:"REJECTED", approvalEvidence:{...(r.approvalEvidence as any),reason}}).where(eq(executionApprovalsTable.id,id)).returning();
    await emitPlatformEvent({ tenantId:u.tenantId,eventType:"EXECUTION_APPROVAL_REJECTED",severity:"WARNING",source:"governance-approval",correlationId:`approval:${u.id}`,entityType:u.entityType,entityId:u.entityId,message:"Approval rejected",evidence:u }); return u; }
  async expire(id:number){ const [u]=await db.update(executionApprovalsTable).set({ approvalStatus:"EXPIRED" }).where(and(eq(executionApprovalsTable.id,id),eq(executionApprovalsTable.approvalStatus,"PENDING"))).returning(); return u; }
  getApprovalStatus(id:number){ return db.select().from(executionApprovalsTable).where(eq(executionApprovalsTable.id,id)).orderBy(desc(executionApprovalsTable.updatedAt)).limit(1).then((r)=>r[0] ?? null); }
}
