export type M365ConnectorState =
  | "CONNECTED"
  | "CONNECTED_READ_ONLY"
  | "DEGRADED"
  | "MISSING_SCOPES"
  | "AUTH_FAILED"
  | "INSUFFICIENT_PERMISSIONS"
  | "STALE_EVIDENCE"
  | "BLOCKED_BY_TENANT_MODE";

export type VerificationLifecycleStatus =
  | "PENDING_VERIFICATION"
  | "PARTIALLY_VERIFIED"
  | "VERIFIED"
  | "FAILED_VERIFICATION"
  | "VERIFICATION_EXPIRED";

export const M365_CONNECTOR_CAPABILITY_REGISTRY = {
  READ_USERS: { capabilityId: "READ_USERS", displayName: "Read users", accessClass: "READ", reversibility: "N/A", blastRadiusClass: "LOW", approvalRequired: false, verificationStrategy: "EVIDENCE_REPLAY", rollbackSupported: false, propagationRealism: "IMMEDIATE", expectedDelayMinutes: 0, requiredGraphScopes: ["User.Read.All", "Directory.Read.All"], minimumTenantMode: "PILOT_READ_ONLY" },
  READ_LICENSES: { capabilityId: "READ_LICENSES", displayName: "Read licence inventory", accessClass: "READ", reversibility: "N/A", blastRadiusClass: "LOW", approvalRequired: false, verificationStrategy: "EVIDENCE_REPLAY", rollbackSupported: false, propagationRealism: "IMMEDIATE", expectedDelayMinutes: 0, requiredGraphScopes: ["Organization.Read.All", "Directory.Read.All"], minimumTenantMode: "PILOT_READ_ONLY" },
  READ_SIGNIN_ACTIVITY: { capabilityId: "READ_SIGNIN_ACTIVITY", displayName: "Read sign-in activity", accessClass: "READ", reversibility: "N/A", blastRadiusClass: "LOW", approvalRequired: false, verificationStrategy: "EVIDENCE_FRESHNESS_SLA", rollbackSupported: false, propagationRealism: "DELAYED", expectedDelayMinutes: 5, requiredGraphScopes: ["AuditLog.Read.All", "Directory.Read.All"], minimumTenantMode: "PILOT_READ_ONLY" },
  READ_GROUPS: { capabilityId: "READ_GROUPS", displayName: "Read groups", accessClass: "READ", reversibility: "N/A", blastRadiusClass: "LOW", approvalRequired: false, verificationStrategy: "MEMBERSHIP_PROOF", rollbackSupported: false, propagationRealism: "IMMEDIATE", expectedDelayMinutes: 0, requiredGraphScopes: ["Group.Read.All"], minimumTenantMode: "PILOT_READ_ONLY" },
  READ_SUBSCRIPTIONS: { capabilityId: "READ_SUBSCRIPTIONS", displayName: "Read subscriptions", accessClass: "READ", reversibility: "N/A", blastRadiusClass: "LOW", approvalRequired: false, verificationStrategy: "BILLING_RECONCILIATION", rollbackSupported: false, propagationRealism: "DELAYED", expectedDelayMinutes: 10, requiredGraphScopes: ["Organization.Read.All"], minimumTenantMode: "PILOT_READ_ONLY" },
  REMOVE_LICENSE: { capabilityId: "REMOVE_LICENSE", displayName: "Remove license", accessClass: "WRITE", reversibility: "REVERSIBLE", blastRadiusClass: "MEDIUM", approvalRequired: true, verificationStrategy: "POST_EXECUTION_RECONCILIATION", rollbackSupported: true, propagationRealism: "DELAYED", expectedDelayMinutes: 30, requiredGraphScopes: ["User.ReadWrite.All", "Directory.ReadWrite.All"], minimumTenantMode: "PRODUCTION_APPROVAL_REQUIRED" },
  ASSIGN_LICENSE: { capabilityId: "ASSIGN_LICENSE", displayName: "Assign license", accessClass: "WRITE", reversibility: "REVERSIBLE", blastRadiusClass: "MEDIUM", approvalRequired: true, verificationStrategy: "POST_EXECUTION_RECONCILIATION", rollbackSupported: true, propagationRealism: "DELAYED", expectedDelayMinutes: 30, requiredGraphScopes: ["User.ReadWrite.All", "Directory.ReadWrite.All"], minimumTenantMode: "PRODUCTION_APPROVAL_REQUIRED" },
  READ_AUDIT_LOGS: { capabilityId: "READ_AUDIT_LOGS", displayName: "Read audit logs", accessClass: "READ", reversibility: "N/A", blastRadiusClass: "LOW", approvalRequired: false, verificationStrategy: "AUDIT_EVENT_PROOF", rollbackSupported: false, propagationRealism: "DELAYED", expectedDelayMinutes: 15, requiredGraphScopes: ["AuditLog.Read.All"], minimumTenantMode: "PILOT_READ_ONLY" },
  READ_DIRECTORY_ROLES: { capabilityId: "READ_DIRECTORY_ROLES", displayName: "Read directory roles", accessClass: "READ", reversibility: "N/A", blastRadiusClass: "LOW", approvalRequired: false, verificationStrategy: "ROLE_MEMBERSHIP_PROOF", rollbackSupported: false, propagationRealism: "IMMEDIATE", expectedDelayMinutes: 0, requiredGraphScopes: ["RoleManagement.Read.Directory", "Directory.Read.All"], minimumTenantMode: "PILOT_READ_ONLY" },
} as const;

export function evaluateM365ConnectorReadiness(input: { authSucceeded: boolean; tenantReachable: boolean; grantedScopes: string[]; requiredScopes: string[]; activityEndpointAccessible: boolean; licenceEndpointAccessible: boolean; evidenceFreshnessHours: number; maxFreshnessHours: number; tenantMode: string; writeCapabilitiesRequested: boolean; }): { state: M365ConnectorState; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.authSucceeded) return { state: "AUTH_FAILED", reasons: ["GRAPH_AUTH_FAILED"] };
  if (!input.tenantReachable) return { state: "INSUFFICIENT_PERMISSIONS", reasons: ["TENANT_UNREACHABLE"] };
  const missingScopes = input.requiredScopes.filter((x) => !input.grantedScopes.includes(x));
  if (missingScopes.length > 0) return { state: "MISSING_SCOPES", reasons: missingScopes };
  if (!["PILOT_READ_ONLY", "PRODUCTION_APPROVAL_REQUIRED", "PRODUCTION_GOVERNED_EXECUTION"].includes(input.tenantMode)) return { state: "BLOCKED_BY_TENANT_MODE", reasons: [input.tenantMode] };
  if (input.evidenceFreshnessHours > input.maxFreshnessHours) return { state: "STALE_EVIDENCE", reasons: [String(input.evidenceFreshnessHours)] };
  if (!input.activityEndpointAccessible || !input.licenceEndpointAccessible) {
    reasons.push("GRAPH_ENDPOINT_DEGRADED");
    return { state: "DEGRADED", reasons };
  }
  if (!input.writeCapabilitiesRequested) return { state: "CONNECTED_READ_ONLY", reasons: [] };
  return { state: "CONNECTED", reasons: [] };
}
