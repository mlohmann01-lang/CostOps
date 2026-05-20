export type M365RollbackReadinessState =
  | "ROLLBACK_READY"
  | "ROLLBACK_NOT_READY"
  | "ROLLBACK_BLOCKED"
  | "ROLLBACK_DEGRADED"
  | "ROLLBACK_PENDING_APPROVAL"
  | "ROLLBACK_PENDING_WRITE_SCOPES"
  | "ROLLBACK_PENDING_CONFIG"
  | "ROLLBACK_READY_NOT_LIVE_ENABLED"
  | "ROLLBACK_NOT_APPLICABLE";

export type M365RollbackReadinessInput = {
  tenantId: string; executionId: string; recommendationId: number; tenantMode: string; removedSkuIds: string[]; userId: string; userPrincipalName: string;
  currentUserEvidence: { userExists: boolean; accountEnabled: boolean; assignedSkuIds: string[] };
  originalExecutionEvidence: { exists: boolean };
  connectorReadiness: string; grantedGraphScopes: string[]; approvalPolicy: { configured: boolean; rollbackApprovalRequired: boolean };
  rollbackConfig: { configured: boolean }; liveRollbackFlag: boolean; outcomeLedgerState: { linked: boolean }; driftState: string;
};
export type M365RollbackReadinessReport = {
  rollbackReadinessState: M365RollbackReadinessState; ready: boolean; tenantId: string; executionId: string; userId: string; userPrincipalName: string; removedSkuIds: string[];
  userStillExists: boolean; userStillDisabled: boolean; skusCurrentlyAbsent: boolean; rollbackScopesPresent: boolean; missingScopes: string[]; approvalRequired: boolean; approvalPolicyReady: boolean; rollbackConfigReady: boolean; connectorWriteReady: boolean; liveRollbackFlagEnabled: boolean; outcomeLedgerLinked: boolean; driftState: string; blockers: string[]; warnings: string[]; requiredActions: string[]; lastCheckedAt: string;
};
const REQUIRED = ["User.ReadWrite.All", "Directory.ReadWrite.All"];
export function evaluateM365RollbackReadiness(i: M365RollbackReadinessInput): M365RollbackReadinessReport {
  const missingScopes = REQUIRED.filter((s) => !i.grantedGraphScopes.includes(s));
  const blockers: string[] = []; const warnings: string[] = []; const requiredActions: string[] = [];
  const userStillExists = i.currentUserEvidence.userExists;
  const userStillDisabled = i.currentUserEvidence.accountEnabled === false;
  const skusCurrentlyAbsent = i.removedSkuIds.every((s) => !i.currentUserEvidence.assignedSkuIds.includes(s));
  const rollbackScopesPresent = missingScopes.length === 0;
  const approvalPolicyReady = i.approvalPolicy.configured;
  const rollbackConfigReady = i.rollbackConfig.configured;
  const connectorWriteReady = i.connectorReadiness === "HEALTHY";
  const outcomeLedgerLinked = i.outcomeLedgerState.linked;
  if (i.tenantMode !== "PRODUCTION_GOVERNED_EXECUTION") blockers.push("TENANT_MODE_BLOCKS_ROLLBACK");
  if (!i.originalExecutionEvidence.exists) blockers.push("ORIGINAL_EXECUTION_EVIDENCE_MISSING");
  if (i.removedSkuIds.length === 0) blockers.push("REMOVED_SKUS_UNKNOWN");
  if (!userStillExists) blockers.push("USER_NOT_FOUND");
  if (!rollbackScopesPresent) blockers.push("MISSING_ROLLBACK_WRITE_SCOPES");
  if (!approvalPolicyReady) blockers.push("APPROVAL_POLICY_NOT_CONFIGURED");
  if (!rollbackConfigReady) blockers.push("ROLLBACK_CONFIG_NOT_CONFIGURED");
  if (!outcomeLedgerLinked) blockers.push("OUTCOME_LEDGER_NOT_LINKED");
  if (!connectorWriteReady) blockers.push("CONNECTOR_NOT_WRITE_READY");
  if (!userStillDisabled) warnings.push("USER_IS_REENABLED");
  if (!skusCurrentlyAbsent) warnings.push("SKUS_ALREADY_PRESENT");
  let state: M365RollbackReadinessState = "ROLLBACK_READY";
  if (!userStillExists) state = "ROLLBACK_NOT_APPLICABLE";
  else if (!approvalPolicyReady) state = "ROLLBACK_PENDING_APPROVAL";
  else if (!rollbackScopesPresent) state = "ROLLBACK_PENDING_WRITE_SCOPES";
  else if (!rollbackConfigReady) state = "ROLLBACK_PENDING_CONFIG";
  else if (blockers.length > 0) state = "ROLLBACK_BLOCKED";
  else if (!i.liveRollbackFlag) state = "ROLLBACK_READY_NOT_LIVE_ENABLED";
  else if (!userStillDisabled || !skusCurrentlyAbsent) state = "ROLLBACK_DEGRADED";
  const ready = state === "ROLLBACK_READY";
  if (state === "ROLLBACK_READY_NOT_LIVE_ENABLED") requiredActions.push("Enable M365_LIVE_LICENSE_ROLLBACK_ENABLED=true");
  return { rollbackReadinessState: state, ready, tenantId: i.tenantId, executionId: i.executionId, userId: i.userId, userPrincipalName: i.userPrincipalName, removedSkuIds: i.removedSkuIds, userStillExists, userStillDisabled, skusCurrentlyAbsent, rollbackScopesPresent, missingScopes, approvalRequired: i.approvalPolicy.rollbackApprovalRequired, approvalPolicyReady, rollbackConfigReady, connectorWriteReady, liveRollbackFlagEnabled: i.liveRollbackFlag, outcomeLedgerLinked, driftState: i.driftState, blockers, warnings, requiredActions, lastCheckedAt: new Date().toISOString() };
}
