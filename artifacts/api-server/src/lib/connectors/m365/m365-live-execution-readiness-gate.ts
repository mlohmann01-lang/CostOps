export type M365LiveExecutionReadinessState =
  | "LIVE_EXECUTION_READY"
  | "LIVE_EXECUTION_NOT_READY"
  | "LIVE_EXECUTION_BLOCKED"
  | "LIVE_EXECUTION_DEGRADED"
  | "LIVE_EXECUTION_PENDING_APPROVAL_SETUP"
  | "LIVE_EXECUTION_PENDING_WRITE_SCOPES"
  | "LIVE_EXECUTION_PENDING_VERIFICATION_CONFIG"
  | "LIVE_EXECUTION_PENDING_ROLLBACK_CONFIG";

export type M365LiveExecutionReadinessInput = {
  tenantId: string;
  tenantMode: string;
  connectorReadiness: "HEALTHY" | "DEGRADED" | "FAILED" | string;
  grantedGraphScopes: string[];
  approvalPolicy: { configured: boolean };
  verificationConfig: { enabled: boolean };
  rollbackConfig: { configured: boolean };
  liveMutationFlag: boolean;
  latestSyncSummary: { evidenceFreshness?: string; connectorReadiness?: string };
  outcomeLedgerHealth: { writable: boolean };
  driftMonitorHealth: { active: boolean };
};

export type M365LiveExecutionReadinessReport = {
  readinessState: M365LiveExecutionReadinessState;
  ready: boolean;
  tenantId: string;
  tenantMode: string;
  canReadGraph: boolean;
  canWriteGraph: boolean;
  requiredScopesPresent: boolean;
  missingScopes: string[];
  approvalPolicyReady: boolean;
  verificationReady: boolean;
  rollbackReady: boolean;
  evidenceFreshnessReady: boolean;
  outcomeLedgerReady: boolean;
  driftMonitoringReady: boolean;
  liveMutationFlagEnabled: boolean;
  blockers: string[];
  warnings: string[];
  requiredActions: string[];
  lastCheckedAt: string;
};

const REQUIRED_WRITE_SCOPES = ["User.ReadWrite.All", "Directory.ReadWrite.All"];

export function evaluateM365LiveExecutionReadiness(input: M365LiveExecutionReadinessInput): M365LiveExecutionReadinessReport {
  const missingScopes = REQUIRED_WRITE_SCOPES.filter((s) => !input.grantedGraphScopes.includes(s));
  const blockers: string[] = [];
  const warnings: string[] = [];
  const requiredActions: string[] = [];

  const canReadGraph = input.connectorReadiness !== "FAILED";
  const canWriteGraph = input.connectorReadiness === "HEALTHY";
  const requiredScopesPresent = missingScopes.length === 0;
  const approvalPolicyReady = input.approvalPolicy.configured;
  const verificationReady = input.verificationConfig.enabled;
  const rollbackReady = input.rollbackConfig.configured;
  const evidenceFreshnessReady = (input.latestSyncSummary.evidenceFreshness ?? "MISSING") === "FRESH";
  const outcomeLedgerReady = input.outcomeLedgerHealth.writable;
  const driftMonitoringReady = input.driftMonitorHealth.active;

  if (input.tenantMode !== "PRODUCTION_GOVERNED_EXECUTION") { blockers.push("TENANT_MODE_NOT_PRODUCTION_GOVERNED"); requiredActions.push("Set tenant mode to PRODUCTION_GOVERNED_EXECUTION"); }
  if (!input.liveMutationFlag) { blockers.push("LIVE_MUTATION_FLAG_DISABLED"); requiredActions.push("Enable M365_LIVE_LICENSE_MUTATION_ENABLED=true"); }
  if (!requiredScopesPresent) { blockers.push("MISSING_WRITE_SCOPES"); requiredActions.push(`Grant scopes: ${missingScopes.join(",")}`); }
  if (!approvalPolicyReady) { blockers.push("APPROVAL_POLICY_NOT_CONFIGURED"); requiredActions.push("Configure approval policy"); }
  if (!verificationReady) { blockers.push("VERIFICATION_NOT_CONFIGURED"); requiredActions.push("Enable verification config"); }
  if (!rollbackReady) { blockers.push("ROLLBACK_NOT_CONFIGURED"); requiredActions.push("Configure rollback scaffold"); }
  if (!outcomeLedgerReady) { blockers.push("OUTCOME_LEDGER_NOT_WRITABLE"); requiredActions.push("Restore ledger write health"); }
  if (!driftMonitoringReady) { blockers.push("DRIFT_MONITOR_INACTIVE"); requiredActions.push("Activate drift monitoring"); }
  if (!canWriteGraph) { blockers.push("CONNECTOR_NOT_WRITE_CAPABLE"); requiredActions.push("Restore M365 connector write capability"); }
  if (!evidenceFreshnessReady) warnings.push("EVIDENCE_NOT_FRESH");

  let readinessState: M365LiveExecutionReadinessState = "LIVE_EXECUTION_READY";
  if (!approvalPolicyReady) readinessState = "LIVE_EXECUTION_PENDING_APPROVAL_SETUP";
  else if (!requiredScopesPresent) readinessState = "LIVE_EXECUTION_PENDING_WRITE_SCOPES";
  else if (!verificationReady) readinessState = "LIVE_EXECUTION_PENDING_VERIFICATION_CONFIG";
  else if (!rollbackReady) readinessState = "LIVE_EXECUTION_PENDING_ROLLBACK_CONFIG";
  else if (blockers.length > 0) readinessState = "LIVE_EXECUTION_BLOCKED";
  else if (!evidenceFreshnessReady || input.connectorReadiness === "DEGRADED") readinessState = "LIVE_EXECUTION_DEGRADED";

  const ready = readinessState === "LIVE_EXECUTION_READY";
  if (!ready && readinessState === "LIVE_EXECUTION_READY") readinessState = "LIVE_EXECUTION_NOT_READY";

  return { readinessState, ready, tenantId: input.tenantId, tenantMode: input.tenantMode, canReadGraph, canWriteGraph, requiredScopesPresent, missingScopes, approvalPolicyReady, verificationReady, rollbackReady, evidenceFreshnessReady, outcomeLedgerReady, driftMonitoringReady, liveMutationFlagEnabled: input.liveMutationFlag, blockers, warnings, requiredActions, lastCheckedAt: new Date().toISOString() };
}
