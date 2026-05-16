import { db, executionGovernancePoliciesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type GovernanceEvaluation = { allowed: boolean; requiresApproval: boolean; blocked: boolean; reasons: string[]; matchedPolicies: string[] };

export class ExecutionGovernancePolicyService {
  async listPolicies(tenantId: string) { return db.select().from(executionGovernancePoliciesTable).where(eq(executionGovernancePoliciesTable.tenantId, tenantId)); }
  private async eval(tenantId: string, input: any): Promise<GovernanceEvaluation> {
    const policies = (await this.listPolicies(tenantId)).filter((p:any)=>p.enabled);
    const reasons:string[]=[]; const matchedPolicies:string[]=[]; let blocked=false; let requiresApproval=Boolean(input.approvalRequired);
    for (const p of policies) {
      const match = (arr:any[], v:any) => Array.isArray(arr) && arr.includes(v);
      if (match(p.restrictedActionTypes as any[], input.actionType)) { blocked = true; reasons.push("RESTRICTED_ACTION_TYPE"); matchedPolicies.push(p.policyName); }
      if (match(p.restrictedPlaybooks as any[], input.playbookId)) { blocked = true; reasons.push("RESTRICTED_PLAYBOOK"); matchedPolicies.push(p.policyName); }
      if (typeof p.maxAnnualizedSavingsWithoutApproval === 'number' && Number(input.annualizedSavings ?? 0) > p.maxAnnualizedSavingsWithoutApproval) { requiresApproval = true; reasons.push("ANNUALIZED_SAVINGS_APPROVAL_REQUIRED"); matchedPolicies.push(p.policyName); }
      if (p.requiresApprovalRiskClass && input.riskClass && input.riskClass >= p.requiresApprovalRiskClass) { requiresApproval = true; reasons.push("RISK_CLASS_APPROVAL_REQUIRED"); matchedPolicies.push(p.policyName); }
      if (input.kind === 'promotion' && !p.allowAutomationPromotion) { blocked = true; reasons.push("AUTOMATION_PROMOTION_DISABLED"); matchedPolicies.push(p.policyName); }
      if (input.kind === 'rollback' && !p.allowRollbackRecommendation) { blocked = true; reasons.push("ROLLBACK_RECOMMENDATION_DISABLED"); matchedPolicies.push(p.policyName); }
    }
    if (["BLOCK","QUARANTINE"].includes(String(input.runtimeControlStatus ?? ""))) { blocked = true; reasons.push("RUNTIME_CONTROL_NON_OVERRIDABLE"); }
    return { allowed: !blocked, requiresApproval, blocked, reasons: [...new Set(reasons)], matchedPolicies: [...new Set(matchedPolicies)] };
  }
  evaluateRecommendationAgainstPolicy(tenantId:string,input:any){ return this.eval(tenantId,{...input,kind:'recommendation'}); }
  evaluateBatchAgainstPolicy(tenantId:string,input:any){ return this.eval(tenantId,{...input,kind:'batch'}); }
  evaluateAutomationPromotionAgainstPolicy(tenantId:string,input:any){ return this.eval(tenantId,{...input,kind:'promotion'}); }
  evaluateVerificationRollbackAgainstPolicy(tenantId:string,input:any){ return this.eval(tenantId,{...input,kind:'rollback'}); }
}
