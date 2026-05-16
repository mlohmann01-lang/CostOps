import { ExecutionOrchestrationRepository } from "./execution-orchestration.repository";

type Bucket = { expectedMonthlySavings:number; expectedAnnualSavings:number; verifiedMonthlySavings:number; verifiedAnnualSavings:number; disputedMonthlySavings:number; disputedAnnualSavings:number; failedMonthlySavings:number; failedAnnualSavings:number; rollbackReviewMonthlySavings:number; rollbackReviewAnnualSavings:number; count:number };
const empty = (): Bucket => ({ expectedMonthlySavings:0, expectedAnnualSavings:0, verifiedMonthlySavings:0, verifiedAnnualSavings:0, disputedMonthlySavings:0, disputedAnnualSavings:0, failedMonthlySavings:0, failedAnnualSavings:0, rollbackReviewMonthlySavings:0, rollbackReviewAnnualSavings:0, count:0 });

export class SavingsProofService {
  constructor(private readonly repo = new ExecutionOrchestrationRepository()) {}
  private apply(b: Bucket, v:any){
    b.count += 1;
    b.expectedMonthlySavings += Number(v.expectedMonthlySaving ?? 0);
    b.expectedAnnualSavings += Number(v.expectedAnnualSaving ?? 0);
    if(v.verificationStatus === "VERIFIED"){ b.verifiedMonthlySavings += Number(v.actualMonthlySaving ?? 0); b.verifiedAnnualSavings += Number(v.actualAnnualSaving ?? 0); }
    if(v.verificationStatus === "DISPUTED"){ b.disputedMonthlySavings += Number(v.actualMonthlySaving ?? v.expectedMonthlySaving ?? 0); b.disputedAnnualSavings += Number(v.actualAnnualSaving ?? v.expectedAnnualSaving ?? 0); }
    if(v.verificationStatus === "FAILED"){ b.failedMonthlySavings += Number(v.actualMonthlySaving ?? v.expectedMonthlySaving ?? 0); b.failedAnnualSavings += Number(v.actualAnnualSaving ?? v.expectedAnnualSaving ?? 0); }
    if(v.verificationStatus === "NEEDS_ROLLBACK_REVIEW"){ b.rollbackReviewMonthlySavings += Number(v.actualMonthlySaving ?? v.expectedMonthlySaving ?? 0); b.rollbackReviewAnnualSavings += Number(v.actualAnnualSaving ?? v.expectedAnnualSaving ?? 0); }
  }
  private confidence(summary: Bucket){
    const expected = summary.expectedMonthlySavings;
    const verified = summary.verifiedMonthlySavings;
    const failed = summary.failedMonthlySavings;
    const verificationRatePercent = expected > 0 ? (verified/expected)*100 : 0;
    const failureRatePercent = expected > 0 ? (failed/expected)*100 : 0;
    const savingsConfidence = verificationRatePercent >= 80 && failureRatePercent <= 5 ? "HIGH" : verificationRatePercent >= 50 && failureRatePercent <= 15 ? "MEDIUM" : "LOW";
    return { verificationRatePercent: Number(verificationRatePercent.toFixed(2)), failureRatePercent: Number(failureRatePercent.toFixed(2)), savingsConfidence };
  }
  async getSavingsProofSummary(tenantId:string){ const rows = await this.repo.listVerifications(tenantId); const out = empty(); rows.forEach((v:any)=>this.apply(out,v)); return { ...out, ...this.confidence(out) }; }
  async getSavingsProofByActionType(tenantId:string){ const rows = await this.repo.listVerifications(tenantId); const m:Record<string,Bucket>={}; for(const v of rows){ const k=String(v.actionType ?? "UNKNOWN"); m[k] ??= empty(); this.apply(m[k],v);} return Object.entries(m).map(([actionType,metrics])=>({actionType,...metrics})); }
  async getSavingsProofByStatus(tenantId:string){ const rows = await this.repo.listVerifications(tenantId); const m:Record<string,Bucket>={}; for(const v of rows){ const k=String(v.verificationStatus ?? "UNKNOWN"); m[k] ??= empty(); this.apply(m[k],v);} return Object.entries(m).map(([verificationStatus,metrics])=>({verificationStatus,...metrics})); }
  async getSavingsProofByPlaybook(tenantId:string){ const rows = await this.repo.listVerifications(tenantId); const plans = await this.repo.listPlans(tenantId); const planToPlaybook:Record<string,string>={}; plans.forEach((p:any)=>planToPlaybook[String(p.id)] = String(p.playbookId ?? "UNKNOWN")); const m:Record<string,Bucket>={}; for(const v of rows){ const k=planToPlaybook[String(v.planId)] ?? "UNKNOWN"; m[k] ??= empty(); this.apply(m[k],v);} return Object.entries(m).map(([playbookId,metrics])=>({playbookId,...metrics})); }
  async getSavingsProofTimeline(tenantId:string, range="30d"){ const rows = await this.repo.listVerifications(tenantId); const days = range === "7d" ? 7 : range === "90d" ? 90 : 30; const floor = Date.now() - days*86400000; const m:Record<string,Bucket>={}; for(const v of rows){ const t = new Date(v.createdAt).getTime(); if(t < floor) continue; const d = new Date(v.createdAt).toISOString().slice(0,10); m[d] ??= empty(); this.apply(m[d],v);} return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,metrics])=>({date,...metrics})); }
}
