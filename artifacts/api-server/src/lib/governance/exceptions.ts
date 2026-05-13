import { db, governanceExceptionEventsTable, governanceExceptionsTable } from "@workspace/db";
import { and, eq, lte, or } from "drizzle-orm";
import { canApprove } from "./authorization";

const mem:any[] = [];
export async function createExceptionRequest(input:any){ if(!input.expiresAt) throw new Error("EXPIRES_AT_REQUIRED"); const now=new Date(); if(new Date(input.expiresAt)<=now) throw new Error("EXPIRES_AT_IN_FUTURE_REQUIRED"); const row={ tenantId:input.tenantId??"default", exceptionType:input.exceptionType, targetType:input.targetType, targetId:input.targetId, recommendationId:input.recommendationId??null, policyId:input.policyId??null, requestedBy:input.requestedBy, approvedBy:null, status:"PENDING", reason:input.reason??"", businessJustification:input.businessJustification??"", riskAccepted:input.riskAccepted??"", startsAt:new Date(input.startsAt??now), expiresAt:new Date(input.expiresAt), evidence:input.evidence??{}, updatedAt:new Date()};
try{ const [r]=await db.insert(governanceExceptionsTable).values(row).returning(); await db.insert(governanceExceptionEventsTable).values({exceptionId:r.id,tenantId:r.tenantId,actorId:r.requestedBy,eventType:"REQUESTED",reason:r.reason,evidence:r.evidence}); return r;}catch{ const r={id:mem.length+1,...row}; mem.push(r); return r; }
}
async function act(id:number,actorId:string,eventType:string,status:string,reason?:string){
  try {
    const [r]=await db.select().from(governanceExceptionsTable).where(eq(governanceExceptionsTable.id,id)).limit(1); if(!r) throw new Error("NOT_FOUND");
    if(eventType==="APPROVED"){ if(r.requestedBy===actorId) throw new Error("SELF_APPROVAL_BLOCKED"); const a=canApprove(actorId,r.tenantId,{actionRiskProfile:{riskClass:"B"}}); if(!a.allowed) throw new Error(`AUTH_${a.reason}`);} 
    const [u]=await db.update(governanceExceptionsTable).set({status,approvedBy:eventType==="APPROVED"?actorId:r.approvedBy,updatedAt:new Date()}).where(eq(governanceExceptionsTable.id,id)).returning();
    await db.insert(governanceExceptionEventsTable).values({exceptionId:id,tenantId:r.tenantId,actorId,eventType,reason:reason??"",evidence:{}}); return u;
  } catch {
    const r = mem.find((m)=>m.id===id); if(!r) throw new Error("NOT_FOUND");
    if(eventType==="APPROVED"){ if(r.requestedBy===actorId) throw new Error("SELF_APPROVAL_BLOCKED"); const a=canApprove(actorId,r.tenantId,{actionRiskProfile:{riskClass:"B"}}); if(!a.allowed) throw new Error(`AUTH_${a.reason}`);} 
    r.status=status; if(eventType==="APPROVED") r.approvedBy=actorId; return r;
  }
}
export const approveException=(i:any)=>act(i.exceptionId,i.actorId,"APPROVED","APPROVED",i.reason);
export const rejectException=(i:any)=>act(i.exceptionId,i.actorId,"REJECTED","REJECTED",i.reason);
export const cancelException=(i:any)=>act(i.exceptionId,i.actorId,"CANCELLED","CANCELLED",i.reason);
export async function expireExceptions({tenantId}:{tenantId:string}){ try{ const rows=await db.select().from(governanceExceptionsTable).where(and(eq(governanceExceptionsTable.tenantId,tenantId),eq(governanceExceptionsTable.status,"APPROVED"),lte(governanceExceptionsTable.expiresAt,new Date()))); let c=0; for(const r of rows){ await db.update(governanceExceptionsTable).set({status:"EXPIRED",updatedAt:new Date()}).where(eq(governanceExceptionsTable.id,r.id)); await db.insert(governanceExceptionEventsTable).values({exceptionId:r.id,tenantId:r.tenantId,actorId:"system",eventType:"EXPIRED",reason:"expired",evidence:{}}); c++; } return {expiredCount:c,warnings:[],errors:[]}; }catch{return {expiredCount:0,warnings:["DB_UNAVAILABLE"],errors:[]};}}
export async function getActiveExceptions(ctx:any){ try{return await db.select().from(governanceExceptionsTable).where(and(eq(governanceExceptionsTable.tenantId,ctx.tenantId),eq(governanceExceptionsTable.status,"APPROVED"),or(eq(governanceExceptionsTable.recommendationId,ctx.recommendationId??""),eq(governanceExceptionsTable.targetId,ctx.targetId??""))));}catch{return mem.filter((m)=>m.tenantId===ctx.tenantId && m.status==="APPROVED");}}
export async function evaluateExceptions(ctx:any){ const active=await getActiveExceptions(ctx); const applied:any[]=[]; const reasons:string[]=[]; const warnings:string[]=[]; let overrideDecision:any=null; for(const e of active){ if(new Date(e.expiresAt)<=new Date()) continue; if(e.exceptionType==="RECOMMENDATION_SUPPRESSION") {applied.push(e.id); reasons.push("SUPPRESSED_BY_EXCEPTION");}
if(e.exceptionType==="POLICY_OVERRIDE" && ctx.policyDecision==="REQUIRE_APPROVAL" && ctx.riskClass==="A") {overrideDecision="ALLOW"; applied.push(e.id);} if(e.exceptionType==="PRICING_CONFIDENCE_OVERRIDE" && ["UNKNOWN","PUBLIC_LIST"].includes(ctx.pricingConfidence??"")){warnings.push("Pricing confidence overridden"); applied.push(e.id);} }
return {active,appliedExceptionIds:applied,reasons,warnings,overrideDecision}; }
