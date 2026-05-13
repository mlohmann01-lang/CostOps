import { evaluateExecutionGate } from "./execution-gate";
import { runDryRun } from "./dry-run";
import { canExecute } from "../governance/authorization";
import { buildIdempotencyKey } from "./idempotency";
import { removeUserLicense } from "./m365-graph-actions";
import { getApprovalStatus } from "../governance/approval-workflow";
import { createPolicyEvaluation, evaluateExecutionPolicy } from "../governance/policy-engine";

export async function runExecutionEngine(input: { recommendation: any; actorId?: string; tenantId: string; mode: "DRY_RUN" | "APPROVAL_EXECUTE"; mvpMode: boolean }) {
  const gateResult = evaluateExecutionGate(input);
  const dryRunResult = runDryRun(input.recommendation);
  const action = input.recommendation?.action ?? "REMOVE_LICENSE";
  const idempotencyKey = buildIdempotencyKey(String(input.recommendation.id), action);
  const authorizationResult = canExecute(input.actorId, input.tenantId, {
    ...input.recommendation,
    actionRiskProfile: gateResult.actionRiskProfile,
  });


  if (!gateResult.allowed || !authorizationResult.allowed) {
    return {
      allowed: false,
      executed: false,
      gate: gateResult.gate,
      denialReasons: authorizationResult.allowed
        ? gateResult.denialReasons
        : [...gateResult.denialReasons, `AUTHORIZATION_${authorizationResult.reason}`],
      actionRiskProfile: gateResult.actionRiskProfile,
      dryRunResult,
      idempotencyKey,
      duplicateExecution: false,
      evidence: { actorId: input.actorId ?? "", mode: input.mode, gatingPassed: false, authorizationResult },
    };
  }

  const policy = await evaluateExecutionPolicy({ tenantId: input.tenantId, actorId: input.actorId, recommendationId: String(input.recommendation.id), action, riskClass: gateResult.actionRiskProfile?.riskClass, trustGate: gateResult.gate, criticalBlockers: input.recommendation.criticalBlockers ?? [], pricingConfidence: input.recommendation.pricingConfidence, reconciliationImpact: (input.recommendation.warnings ?? []).includes("RECONCILIATION_DOWNGRADE") ? "DOWNGRADE" : "NONE", executionMode: input.mode, approvalStatus: input.recommendation.approvalStatus, projectedAnnualSaving: input.recommendation.annualisedCost });
  await createPolicyEvaluation({ tenantId: input.tenantId, recommendationId: String(input.recommendation.id), actorId: input.actorId ?? null, decision: policy.decision, reasons: policy.reasons, evidence: policy.evidence });
  if (policy.decision === "BLOCK") {
    return { allowed: false, executed: false, gate: gateResult.gate, denialReasons: ["POLICY_BLOCK"], actionRiskProfile: gateResult.actionRiskProfile, dryRunResult, idempotencyKey, duplicateExecution: false, evidence: { actorId: input.actorId ?? "", mode: input.mode, gatingPassed: false, authorizationResult, policy } };
  }

  if (input.mode === "APPROVAL_EXECUTE" && gateResult.actionRiskProfile?.riskClass === "B") {
    const preApproved = input.recommendation?.approvalStatus === "APPROVED";
    const approval = preApproved ? { status: "APPROVED" } as any : await getApprovalStatus(String(input.recommendation.id));
    if (!approval || approval.status !== "APPROVED") {
      return { allowed: false, executed: false, gate: gateResult.gate, denialReasons: ["APPROVAL_MISSING_OR_NOT_APPROVED"], actionRiskProfile: gateResult.actionRiskProfile, dryRunResult, idempotencyKey, duplicateExecution: false, evidence: { actorId: input.actorId ?? "", mode: input.mode, gatingPassed: false, authorizationResult, approvalStatus: approval?.status ?? "MISSING" } };
    }
  }
  if (input.mode === "DRY_RUN") {
    const liveEnabled = process.env.ENABLE_LIVE_M365_EXECUTION === "true";
    if (liveEnabled && action === "REMOVE_LICENSE") {
      const liveDryRun = await removeUserLicense({ tenantId: input.tenantId, userPrincipalName: input.recommendation.userEmail, skuId: input.recommendation.licenceSku, actorId: input.actorId, dryRun: true, action });
      return { allowed: true, executed: false, gate: gateResult.gate, denialReasons: [], actionRiskProfile: gateResult.actionRiskProfile, dryRunResult: liveDryRun, idempotencyKey, duplicateExecution: false, executionMode: "LIVE_GRAPH", evidence: { actorId: input.actorId ?? "", mode: input.mode, gatingPassed: true, dryRun: true, authorizationResult, liveExecutionEnabled: true } };
    }
    return {
      allowed: true,
      executed: false,
      gate: gateResult.gate,
      denialReasons: [],
      actionRiskProfile: gateResult.actionRiskProfile,
      dryRunResult,
      idempotencyKey,
      duplicateExecution: false,
      executionMode: "SIMULATED",
      evidence: { actorId: input.actorId ?? "", mode: input.mode, gatingPassed: true, dryRun: true, authorizationResult },
    };
  }

  const liveEnabled = process.env.ENABLE_LIVE_M365_EXECUTION === "true";
  if (liveEnabled && action === "REMOVE_LICENSE") {
    const liveResult = await removeUserLicense({ tenantId: input.tenantId, userPrincipalName: input.recommendation.userEmail, skuId: input.recommendation.licenceSku, actorId: input.actorId, dryRun: false, action });
    if (!liveResult.ok) {
      return { allowed: false, executed: false, gate: gateResult.gate, denialReasons: [String(liveResult.error)], actionRiskProfile: gateResult.actionRiskProfile, dryRunResult, idempotencyKey, duplicateExecution: false, executionMode: "LIVE_GRAPH", evidence: { actorId: input.actorId ?? "", mode: input.mode, gatingPassed: true, authorizationResult, graphError: liveResult } };
    }
    return { allowed: true, executed: true, gate: gateResult.gate, denialReasons: [], actionRiskProfile: gateResult.actionRiskProfile, dryRunResult: liveResult, idempotencyKey, duplicateExecution: false, executionMode: "LIVE_GRAPH", evidence: { actorId: input.actorId ?? "", mode: input.mode, gatingPassed: true, dryRun: false, authorizationResult, graphRequestId: liveResult.requestId, rollbackPayload: liveResult.rollbackPayload } };
  }

  return {
    allowed: true,
    executed: true,
    gate: gateResult.gate,
    denialReasons: [],
    actionRiskProfile: gateResult.actionRiskProfile,
    dryRunResult,
    idempotencyKey,
    duplicateExecution: false,
    executionMode: "SIMULATED",
    evidence: { actorId: input.actorId ?? "", mode: input.mode, gatingPassed: true, dryRun: false, authorizationResult },
  };
}
