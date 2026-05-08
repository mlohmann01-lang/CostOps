import { evaluateExecutionGate } from "./execution-gate";
import { runDryRun } from "./dry-run";
import { canExecute } from "../governance/authorization";
import { buildIdempotencyKey } from "./idempotency";

export async function runExecutionEngine(input: { recommendation: any; actorId?: string; tenantId: string; mode: "DRY_RUN" | "APPROVAL_EXECUTE"; mvpMode: boolean }) {
  const gateResult = evaluateExecutionGate(input);
  const dryRunResult = runDryRun(input.recommendation);
  const action = "REMOVE_LICENSE";
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

  if (input.mode === "DRY_RUN") {
    return {
      allowed: true,
      executed: false,
      gate: gateResult.gate,
      denialReasons: [],
      actionRiskProfile: gateResult.actionRiskProfile,
      dryRunResult,
      idempotencyKey,
      duplicateExecution: false,
      evidence: { actorId: input.actorId ?? "", mode: input.mode, gatingPassed: true, dryRun: true, authorizationResult },
    };
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
    evidence: { actorId: input.actorId ?? "", mode: input.mode, gatingPassed: true, dryRun: false, authorizationResult },
  };
}
