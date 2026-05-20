export const OPERATIONAL_STATES = [
  "GOVERNED_EXECUTION_ELIGIBLE",
  "APPROVAL_REQUIRED",
  "EXECUTION_IN_PROGRESS",
  "VERIFICATION_PENDING",
  "VERIFIED",
  "PARTIAL_FAILURE",
  "DRIFT_DETECTED",
  "ROLLBACK_AVAILABLE",
  "ROLLBACK_REQUIRED",
  "BLOCKED",
  "MANUAL_ONLY",
  "QUARANTINED",
] as const;

export type OperationalState = (typeof OPERATIONAL_STATES)[number];

export const stateTone: Record<OperationalState, string> = {
  GOVERNED_EXECUTION_ELIGIBLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  APPROVAL_REQUIRED: "bg-amber-50 text-amber-700 border-amber-200",
  EXECUTION_IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  VERIFICATION_PENDING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIAL_FAILURE: "bg-rose-50 text-rose-700 border-rose-200",
  DRIFT_DETECTED: "bg-orange-50 text-orange-700 border-orange-200",
  ROLLBACK_AVAILABLE: "bg-cyan-50 text-cyan-700 border-cyan-200",
  ROLLBACK_REQUIRED: "bg-red-50 text-red-700 border-red-200",
  BLOCKED: "bg-red-50 text-red-700 border-red-200",
  MANUAL_ONLY: "bg-slate-100 text-slate-700 border-slate-300",
  QUARANTINED: "bg-zinc-100 text-zinc-700 border-zinc-300",
};
