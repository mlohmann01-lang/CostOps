import { evaluateExecutionGate } from "./execution-gate";
import { runDryRun } from "./dry-run";

export async function runExecutionEngine(input: { recommendation: any; actorId: string; mode: "DRY_RUN" | "APPROVAL_EXECUTE"; mvpMode: boolean }) {
  const gateResult = evaluateExecutionGate(input);
  const dryRunResult = runDryRun(input.recommendation);

  if (!gateResult.allowed) {
    return {
      allowed: false,
      executed: false,
      gate: gateResult.gate,
      denialReasons: gateResult.denialReasons,
      actionRiskProfile: gateResult.actionRiskProfile,
      dryRunResult,
      evidence: { actorId: input.actorId, mode: input.mode, gatingPassed: false },
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
      evidence: { actorId: input.actorId, mode: input.mode, gatingPassed: true, dryRun: true },
    };
  }

  return {
    allowed: true,
    executed: true,
    gate: gateResult.gate,
    denialReasons: [],
    actionRiskProfile: gateResult.actionRiskProfile,
    dryRunResult,
    evidence: { actorId: input.actorId, mode: input.mode, gatingPassed: true, dryRun: false },
  };
}
