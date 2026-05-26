import type { ActionRiskClass } from "./types";

export function isHighRisk(actionRiskClass: ActionRiskClass): boolean {
  return actionRiskClass === "C" || actionRiskClass === "D";
}
