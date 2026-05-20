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
  "CONNECTOR_DEGRADED",
  "CONNECTOR_BLOCKED",
  "DATA_TRUST_INSUFFICIENT",
  "SIMULATION_REQUIRED",
  "APPROVAL_EXPIRED",
  "ACTION_NOT_REVERSIBLE",
] as const;

export type OperationalState = (typeof OPERATIONAL_STATES)[number];

export type OpsSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RollbackVisibility = "NONE" | "AVAILABLE" | "REQUIRED";
export type OutcomeLedgerImplication = "PROJECTED_ONLY" | "PENDING_VERIFICATION" | "VERIFIED_OUTCOME" | "AT_RISK";

export type OperationalStateDefinition = {
  label: string;
  executiveDescription: string;
  operatorMeaning: string;
  severity: OpsSeverity;
  allowedNextActions: string[];
  blockedActions: string[];
  proofRequirements: string[];
  approvalRequirements: string;
  rollbackVisibility: RollbackVisibility;
  outcomeLedgerImplication: OutcomeLedgerImplication;
  uiTone: string;
};

export const OPERATIONAL_STATE_REGISTRY: Record<OperationalState, OperationalStateDefinition> = {
  GOVERNED_EXECUTION_ELIGIBLE: { label: "Governed execution eligible", executiveDescription: "Execution can proceed within policy guardrails.", operatorMeaning: "Ready for next governed action.", severity: "LOW", allowedNextActions: ["SIMULATE", "REQUEST_APPROVAL", "EXECUTE"], blockedActions: ["ROLLBACK"], proofRequirements: ["source_evidence", "trust_scoring"], approvalRequirements: "Policy based", rollbackVisibility: "NONE", outcomeLedgerImplication: "PROJECTED_ONLY", uiTone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  APPROVAL_REQUIRED: { label: "Approval required", executiveDescription: "Action is queued for explicit authorization.", operatorMeaning: "Awaiting approver decision.", severity: "MEDIUM", allowedNextActions: ["APPROVE", "REJECT", "REQUEST_MORE_EVIDENCE"], blockedActions: ["EXECUTE"], proofRequirements: ["approval_decision"], approvalRequirements: "Mandatory", rollbackVisibility: "NONE", outcomeLedgerImplication: "PROJECTED_ONLY", uiTone: "bg-amber-50 text-amber-700 border-amber-200" },
  EXECUTION_IN_PROGRESS: { label: "Execution in progress", executiveDescription: "Change is propagating through connectors.", operatorMeaning: "Monitor propagation and failures.", severity: "MEDIUM", allowedNextActions: ["ESCALATE", "QUARANTINE"], blockedActions: ["APPROVE"], proofRequirements: ["execution_decision", "connector_evidence"], approvalRequirements: "Satisfied", rollbackVisibility: "AVAILABLE", outcomeLedgerImplication: "PENDING_VERIFICATION", uiTone: "bg-blue-50 text-blue-700 border-blue-200" },
  VERIFICATION_PENDING: { label: "Verification pending", executiveDescription: "Financial outcome is awaiting validation.", operatorMeaning: "Hold until verification proof arrives.", severity: "MEDIUM", allowedNextActions: ["REQUEST_MORE_EVIDENCE"], blockedActions: ["EXECUTE"], proofRequirements: ["verification_result"], approvalRequirements: "Satisfied", rollbackVisibility: "AVAILABLE", outcomeLedgerImplication: "PENDING_VERIFICATION", uiTone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  VERIFIED: { label: "Verified", executiveDescription: "Outcome has confirmed savings impact.", operatorMeaning: "Execution complete and validated.", severity: "LOW", allowedNextActions: ["ACKNOWLEDGE_DRIFT"], blockedActions: ["APPROVE"], proofRequirements: ["outcome_ledger_entry"], approvalRequirements: "Complete", rollbackVisibility: "AVAILABLE", outcomeLedgerImplication: "VERIFIED_OUTCOME", uiTone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PARTIAL_FAILURE: { label: "Partial failure", executiveDescription: "Execution completed with recoverable exceptions.", operatorMeaning: "Remediate failed subset.", severity: "HIGH", allowedNextActions: ["ROLLBACK", "ESCALATE"], blockedActions: ["EXECUTE"], proofRequirements: ["execution_decision", "drift_event"], approvalRequirements: "May require re-approval", rollbackVisibility: "REQUIRED", outcomeLedgerImplication: "AT_RISK", uiTone: "bg-rose-50 text-rose-700 border-rose-200" },
  DRIFT_DETECTED: { label: "Drift detected", executiveDescription: "Post-execution posture drift was observed.", operatorMeaning: "Investigate and prevent recurrence.", severity: "HIGH", allowedNextActions: ["ACKNOWLEDGE_DRIFT", "REQUEST_MORE_EVIDENCE"], blockedActions: ["EXECUTE"], proofRequirements: ["drift_event"], approvalRequirements: "Case-by-case", rollbackVisibility: "AVAILABLE", outcomeLedgerImplication: "AT_RISK", uiTone: "bg-orange-50 text-orange-700 border-orange-200" },
  ROLLBACK_AVAILABLE: { label: "Rollback available", executiveDescription: "Rollback path is prepared.", operatorMeaning: "Rollback can be executed if needed.", severity: "MEDIUM", allowedNextActions: ["ROLLBACK"], blockedActions: [], proofRequirements: ["rollback_plan"], approvalRequirements: "Policy based", rollbackVisibility: "AVAILABLE", outcomeLedgerImplication: "PENDING_VERIFICATION", uiTone: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  ROLLBACK_REQUIRED: { label: "Rollback required", executiveDescription: "Control requires rollback to preserve trust.", operatorMeaning: "Immediate rollback expected.", severity: "CRITICAL", allowedNextActions: ["ROLLBACK", "ESCALATE"], blockedActions: ["EXECUTE"], proofRequirements: ["rollback_plan"], approvalRequirements: "Urgent", rollbackVisibility: "REQUIRED", outcomeLedgerImplication: "AT_RISK", uiTone: "bg-red-50 text-red-700 border-red-200" },
  BLOCKED: { label: "Blocked", executiveDescription: "Execution blocked by policy or readiness gaps.", operatorMeaning: "Resolve blockers before proceeding.", severity: "CRITICAL", allowedNextActions: ["REQUEST_MORE_EVIDENCE", "ESCALATE"], blockedActions: ["EXECUTE"], proofRequirements: ["source_evidence"], approvalRequirements: "Not eligible", rollbackVisibility: "NONE", outcomeLedgerImplication: "AT_RISK", uiTone: "bg-red-50 text-red-700 border-red-200" },
  MANUAL_ONLY: { label: "Manual only", executiveDescription: "Automation disabled for this context.", operatorMeaning: "Manual operator action only.", severity: "HIGH", allowedNextActions: ["MARK_MANUAL_ONLY"], blockedActions: ["EXECUTE"], proofRequirements: ["approval_decision"], approvalRequirements: "Manual", rollbackVisibility: "NONE", outcomeLedgerImplication: "PROJECTED_ONLY", uiTone: "bg-slate-100 text-slate-700 border-slate-300" },
  QUARANTINED: { label: "Quarantined", executiveDescription: "Execution quarantined due to elevated risk.", operatorMeaning: "No further action until cleared.", severity: "CRITICAL", allowedNextActions: ["ESCALATE"], blockedActions: ["EXECUTE", "APPROVE"], proofRequirements: ["connector_evidence", "trust_scoring"], approvalRequirements: "Security review", rollbackVisibility: "REQUIRED", outcomeLedgerImplication: "AT_RISK", uiTone: "bg-zinc-100 text-zinc-700 border-zinc-300" },
  CONNECTOR_DEGRADED: { label: "Connector degraded", executiveDescription: "Connector health is degraded.", operatorMeaning: "Proceed with caution and evidence checks.", severity: "HIGH", allowedNextActions: ["SIMULATE", "REQUEST_MORE_EVIDENCE"], blockedActions: ["EXECUTE"], proofRequirements: ["connector_evidence"], approvalRequirements: "Additional review", rollbackVisibility: "NONE", outcomeLedgerImplication: "AT_RISK", uiTone: "bg-orange-50 text-orange-700 border-orange-200" },
  CONNECTOR_BLOCKED: { label: "Connector blocked", executiveDescription: "Connector unavailable for execution.", operatorMeaning: "No connector path currently available.", severity: "CRITICAL", allowedNextActions: ["ESCALATE"], blockedActions: ["EXECUTE", "SIMULATE"], proofRequirements: ["connector_evidence"], approvalRequirements: "N/A", rollbackVisibility: "NONE", outcomeLedgerImplication: "AT_RISK", uiTone: "bg-red-50 text-red-700 border-red-200" },
  DATA_TRUST_INSUFFICIENT: { label: "Data trust insufficient", executiveDescription: "Evidence confidence is below threshold.", operatorMeaning: "Need higher quality proof before action.", severity: "HIGH", allowedNextActions: ["REQUEST_MORE_EVIDENCE", "SIMULATE"], blockedActions: ["EXECUTE"], proofRequirements: ["trust_scoring"], approvalRequirements: "Blocked pending trust", rollbackVisibility: "NONE", outcomeLedgerImplication: "AT_RISK", uiTone: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  SIMULATION_REQUIRED: { label: "Simulation required", executiveDescription: "Execution requires scenario replay first.", operatorMeaning: "Run simulation before approval/execution.", severity: "MEDIUM", allowedNextActions: ["SIMULATE"], blockedActions: ["EXECUTE"], proofRequirements: ["simulation_result"], approvalRequirements: "Post-simulation", rollbackVisibility: "NONE", outcomeLedgerImplication: "PROJECTED_ONLY", uiTone: "bg-violet-50 text-violet-700 border-violet-200" },
  APPROVAL_EXPIRED: { label: "Approval expired", executiveDescription: "Approval window elapsed.", operatorMeaning: "Re-request approval.", severity: "HIGH", allowedNextActions: ["REQUEST_APPROVAL"], blockedActions: ["EXECUTE"], proofRequirements: ["approval_decision"], approvalRequirements: "Re-approval required", rollbackVisibility: "NONE", outcomeLedgerImplication: "AT_RISK", uiTone: "bg-amber-50 text-amber-700 border-amber-200" },
  ACTION_NOT_REVERSIBLE: { label: "Action not reversible", executiveDescription: "Action has no safe rollback path.", operatorMeaning: "Require elevated approval and caution.", severity: "CRITICAL", allowedNextActions: ["REQUEST_APPROVAL", "ESCALATE"], blockedActions: ["ROLLBACK"], proofRequirements: ["rollback_plan"], approvalRequirements: "Executive approval", rollbackVisibility: "NONE", outcomeLedgerImplication: "AT_RISK", uiTone: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
};

export const stateTone: Record<OperationalState, string> = Object.fromEntries(
  Object.entries(OPERATIONAL_STATE_REGISTRY).map(([k, v]) => [k, v.uiTone]),
) as Record<OperationalState, string>;
