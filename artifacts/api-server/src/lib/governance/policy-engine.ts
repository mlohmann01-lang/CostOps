import { db, policyEvaluationsTable } from "@workspace/db";
import { evaluateExceptions } from "./exceptions";

export type PolicyContext = {
  tenantId: string;
  actorId?: string;
  recommendationId?: string;
  action?: string;
  riskClass?: string;
  trustGate?: string;
  criticalBlockers?: string[];
  pricingConfidence?: string;
  reconciliationImpact?: string;
  executionMode?: string;
  approvalStatus?: string;
  projectedAnnualSaving?: number;
};

export async function evaluatePolicies(context: PolicyContext) {
  const reasons: string[] = [];
  let decision: "ALLOW"|"REQUIRE_APPROVAL"|"BLOCK"|"ESCALATE"|"EXCEPTION_REQUIRED" = "ALLOW";
  if ((context.criticalBlockers ?? []).length) { decision = "BLOCK"; reasons.push("CRITICAL_BLOCKERS_PRESENT"); }
  if (["BLOCKED","INVESTIGATE"].includes(context.trustGate ?? "")) { decision = "BLOCK"; reasons.push("TRUST_GATE_BLOCKED"); }
  if (context.riskClass === "C") { decision = "BLOCK"; reasons.push("RISK_CLASS_C_BLOCK"); }
  if (context.riskClass === "B" && decision !== "BLOCK") { decision = "REQUIRE_APPROVAL"; reasons.push("RISK_CLASS_B_APPROVAL_REQUIRED"); }
  if (context.pricingConfidence === "UNKNOWN" && (context.projectedAnnualSaving ?? 0) >= 10000 && decision === "ALLOW") { decision = "ESCALATE"; reasons.push("UNKNOWN_PRICING_HIGH_SAVINGS"); }
  if (["BLOCK","DOWNGRADE"].includes(context.reconciliationImpact ?? "") && decision === "ALLOW") { decision = "ESCALATE"; reasons.push("RECONCILIATION_ESCALATION"); }
  if (context.approvalStatus === "EXPIRED") { decision = "BLOCK"; reasons.push("APPROVAL_EXPIRED"); }
  const ex = await evaluateExceptions({ ...context, policyDecision: decision });
  if (ex.overrideDecision === "ALLOW" && decision === "REQUIRE_APPROVAL" && context.riskClass === "A") { decision = "ALLOW"; reasons.push("POLICY_OVERRIDE_ALLOW"); }
  reasons.push(...ex.reasons);
  return { decision, reasons, evidence: { ...context, appliedExceptionIds: ex.appliedExceptionIds, exceptionWarnings: ex.warnings } };
}

export async function evaluateExecutionPolicy(context: PolicyContext) { return evaluatePolicies(context); }
export async function evaluateApprovalPolicy(context: PolicyContext) {
  const out = await evaluatePolicies(context);
  return { ...out, requiredApproverRole: out.decision === "ESCALATE" ? "ADMIN" : "APPROVER" };
}

export async function createPolicyEvaluation(event: { tenantId: string; policyId?: number|null; recommendationId?: string|null; outcomeLedgerId?: number|null; actorId?: string|null; decision: string; reasons: unknown; evidence: unknown; }) {
  try {
    const [row] = await db.insert(policyEvaluationsTable).values({ tenantId: event.tenantId, policyId: event.policyId ?? null, recommendationId: event.recommendationId ?? null, outcomeLedgerId: event.outcomeLedgerId ?? null, actorId: event.actorId ?? null, decision: event.decision, reasons: event.reasons as any, evidence: event.evidence as any }).returning();
    return row;
  } catch {
    return { id: -1, ...event };
  }
}
