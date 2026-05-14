import type { PlanStatus } from "./execution-orchestration.types";

const transitions: Record<PlanStatus, PlanStatus[]> = {
  DRAFT: ["QUEUED"],
  QUEUED: ["WAITING_APPROVAL", "WAITING_DEPENDENCIES", "READY", "BLOCKED", "QUARANTINED"],
  READY: ["RUNNING"],
  RUNNING: ["COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "PAUSED", "ESCALATED"],
  WAITING_APPROVAL: ["READY", "BLOCKED", "CANCELLED"],
  WAITING_DEPENDENCIES: ["READY", "FAILED", "ESCALATED"],
  PAUSED: ["READY", "CANCELLED"],
  ESCALATED: ["READY", "FAILED", "CANCELLED"],
  PARTIALLY_COMPLETED: ["RUNNING", "COMPLETED", "FAILED"],
  COMPLETED: [], FAILED: [], CANCELLED: [], BLOCKED: [], QUARANTINED: [],
};

export interface OrchestrationTransitionResult { from: PlanStatus; to: PlanStatus; valid: true; }

export function transitionOrchestrationState(from: PlanStatus, to: PlanStatus): OrchestrationTransitionResult {
  if (!transitions[from].includes(to)) throw new Error(`Invalid orchestration state transition: ${from} -> ${to}`);
  return { from, to, valid: true };
}
