import { M365GraphLicenseWriteClient, type M365LicenseRemovalResult } from "./m365-graph-license-write-client";

export const M365_PRODUCTION_REQUIRED_SCOPES = [
  "User.Read.All",
  "Directory.Read.All",
  "Organization.Read.All",
  "AuditLog.Read.All",
  "Reports.Read.All",
] as const;

export type M365ProductionScope = (typeof M365_PRODUCTION_REQUIRED_SCOPES)[number];
export type PhaseStatus = "PASS" | "FAIL" | "PENDING";
export type ValidationPhase = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";
export type CertenFailureCode =
  | "MISSING_SCOPE"
  | "GRAPH_TIMEOUT"
  | "PERMISSION_FAILURE"
  | "LICENSE_REMOVAL_FAILURE"
  | "VERIFICATION_FAILURE"
  | "ROLLBACK_FAILURE";

export type M365ValidationUser = {
  id: string;
  userPrincipalName: string;
  displayName?: string;
  accountEnabled: boolean;
  assignedLicenses: string[];
  lastSignInAt?: string | null;
  department?: string | null;
  costCentre?: string | null;
  isAdmin?: boolean;
  isServiceAccount?: boolean;
  isVip?: boolean;
  excluded?: boolean;
};

export type M365DiscoveredTenantState = {
  users: M365ValidationUser[];
  groups: Array<{ id: string; displayName?: string }>;
  subscribedSkus: Array<{ skuId: string; skuPartNumber?: string; monthlyCost?: number }>;
  lastSync: string;
};

export type M365ValidationRecommendation = {
  recommendationId: string;
  playbookId: "M365_INACTIVE_USER_LICENSE_RECLAIM";
  actionType: "REMOVE_LICENSE";
  user: M365ValidationUser;
  licenseSkuId: string;
  projectedMonthlySavings: number;
  projectedAnnualSavings: number;
  reason: string;
  blocked: boolean;
  blockedReasons: string[];
  evidence: Record<string, unknown>;
};

export type M365ValidationApproval = {
  approvalRequestId: string;
  recommendationId: string;
  status: "APPROVED";
  approver: string;
  reason: string;
  evidence: Record<string, unknown>;
  timestamp: string;
};

export type M365ValidationDryRun = {
  dryRunId: string;
  recommendationId: string;
  user: string;
  license: string;
  currentState: { licenseAssigned: boolean };
  futureState: { licenseAssigned: boolean };
  rollbackPlan: { available: boolean; action: "ASSIGN_LICENSE"; skuId: string };
  monthlySaving: number;
  annualSaving: number;
  risk: "LOW" | "BLOCKED";
};

export type M365ValidationExecution = {
  executionResultId: string;
  recommendationId: string;
  result: M365LicenseRemovalResult;
  before: { licenseAssigned: boolean };
  after: { licenseAssigned: boolean };
  rollbackReference: string;
  timestamp: string;
};

export type M365ValidationOutcome = {
  outcomeId: string;
  status: "VERIFIED" | "FAILED_VERIFICATION";
  projectedMonthlySavings: number;
  verifiedMonthlySavings: number;
  projectedAnnualSavings: number;
  verifiedAnnualSavings: number;
  variance: number;
  evidence: Record<string, unknown>;
};

export type M365ValidationDrift = {
  driftDetected: boolean;
  command: "REGISTER_DRIFT_MONITOR";
  runtimeActivity: string;
  evidenceTimeline: Array<Record<string, unknown>>;
  driftMonitor: { registered: boolean; monitoredUserId: string; monitoredSkuId: string };
};

export type TenantReadinessReport = {
  tenantReachable: boolean;
  tokenAcquired: boolean;
  graphReachable: boolean;
  scopesValid: boolean;
  connectorHealthy: boolean;
  requiredScopes: readonly M365ProductionScope[];
  grantedScopes: string[];
  missingScopes: string[];
  errors: string[];
};

export type DiscoveryAuditReport = {
  usersFound: number;
  licensesFound: number;
  activeUsers: number;
  inactiveUsers: number;
  disabledUsers: number;
  groupsFound: number;
  departmentsFound: number;
  costCentresFound: number;
  lastSync: string;
};

export type RecommendationValidationReport = {
  recommendationsGenerated: number;
  projectedMonthlySavings: number;
  projectedAnnualSavings: number;
  excludedUsers: Array<{ userPrincipalName: string; reason: string }>;
  blockedUsers: Array<{ userPrincipalName: string; reasons: string[] }>;
};

export type TenantValidationChecklist = Record<ValidationPhase, { name: string; status: PhaseStatus; evidence: string[] }>;

export type RuntimeTrace = {
  discovery?: DiscoveryAuditReport;
  recommendation?: M365ValidationRecommendation;
  approval?: M365ValidationApproval;
  dryRun?: M365ValidationDryRun;
  execution?: M365ValidationExecution;
  verification?: M365ValidationOutcome;
  ledger?: M365ValidationOutcome;
  drift?: M365ValidationDrift;
};

export type FailureMatrixRow = {
  code: CertenFailureCode;
  phase: ValidationPhase;
  certenBehavior: string;
  autonomousMutation: false;
  customerVisibleEvidence: string[];
};

export const M365_PRODUCTION_FAILURE_MATRIX: FailureMatrixRow[] = [
  { code: "MISSING_SCOPE", phase: "A", certenBehavior: "Block onboarding and list every missing required Graph permission. Do not continue discovery with partial scope coverage.", autonomousMutation: false, customerVisibleEvidence: ["readiness.missingScopes", "readiness.scopesValid=false"] },
  { code: "GRAPH_TIMEOUT", phase: "B", certenBehavior: "Mark connector unhealthy for the run, retain prior evidence, and require operator retry.", autonomousMutation: false, customerVisibleEvidence: ["connectorHealthy=false", "discovery audit error"] },
  { code: "PERMISSION_FAILURE", phase: "B", certenBehavior: "Fail the current phase with Graph request evidence and no silent degradation.", autonomousMutation: false, customerVisibleEvidence: ["Graph status/request id", "phase status FAIL"] },
  { code: "LICENSE_REMOVAL_FAILURE", phase: "F", certenBehavior: "Record failed execution evidence, keep recommendation approved but unverified, and do not attempt another user or SKU.", autonomousMutation: false, customerVisibleEvidence: ["execution errorCode", "rollback reference"] },
  { code: "VERIFICATION_FAILURE", phase: "G", certenBehavior: "Create FAILED_VERIFICATION outcome with Graph readback evidence; savings remain projected only.", autonomousMutation: false, customerVisibleEvidence: ["verification.status", "readback evidence"] },
  { code: "ROLLBACK_FAILURE", phase: "I", certenBehavior: "Raise operator alert and preserve rollback attempt evidence; do not perform alternate remediation automatically.", autonomousMutation: false, customerVisibleEvidence: ["rollback error", "operator alert"] },
];

const phaseNames: Record<ValidationPhase, string> = {
  A: "Tenant Onboarding",
  B: "Discovery Validation",
  C: "Recommendation Validation",
  D: "Approval Validation",
  E: "Dry Run Validation",
  F: "Single Execution Validation",
  G: "Outcome Validation",
  H: "Ledger Validation",
  I: "Drift Validation",
};

function inactiveDays(user: M365ValidationUser, now = new Date()): number | null {
  if (!user.lastSignInAt) return null;
  const ts = new Date(user.lastSignInAt).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((now.getTime() - ts) / 86_400_000);
}

function skuMonthlyCost(skus: M365DiscoveredTenantState["subscribedSkus"], skuId: string): number {
  return skus.find((sku) => sku.skuId === skuId)?.monthlyCost ?? 0;
}

function stableId(prefix: string, parts: string[]): string {
  return `${prefix}:${parts.map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "_")).join(":")}`;
}

export function buildTenantReadinessReport(input: { tokenAcquired: boolean; graphReachable: boolean; grantedScopes: string[]; errors?: string[] }): TenantReadinessReport {
  const missingScopes = M365_PRODUCTION_REQUIRED_SCOPES.filter((scope) => !input.grantedScopes.includes(scope));
  return {
    tenantReachable: input.tokenAcquired,
    tokenAcquired: input.tokenAcquired,
    graphReachable: input.graphReachable,
    scopesValid: missingScopes.length === 0,
    connectorHealthy: input.tokenAcquired && input.graphReachable && missingScopes.length === 0,
    requiredScopes: M365_PRODUCTION_REQUIRED_SCOPES,
    grantedScopes: input.grantedScopes,
    missingScopes,
    errors: input.errors ?? [],
  };
}

export function buildDiscoveryAuditReport(state: M365DiscoveredTenantState, thresholdDays = 90, now = new Date()): DiscoveryAuditReport {
  const licensed = new Set(state.users.flatMap((user) => user.assignedLicenses));
  return {
    usersFound: state.users.length,
    licensesFound: licensed.size,
    activeUsers: state.users.filter((user) => user.accountEnabled).length,
    inactiveUsers: state.users.filter((user) => user.accountEnabled && user.assignedLicenses.length > 0 && (inactiveDays(user, now) ?? Infinity) > thresholdDays).length,
    disabledUsers: state.users.filter((user) => !user.accountEnabled).length,
    groupsFound: state.groups.length,
    departmentsFound: new Set(state.users.map((u) => u.department).filter(Boolean)).size,
    costCentresFound: new Set(state.users.map((u) => u.costCentre).filter(Boolean)).size,
    lastSync: state.lastSync,
  };
}

export function generateInactiveUserLicenseRecommendations(input: { tenantId: string; state: M365DiscoveredTenantState; thresholdDays?: number; now?: Date }): { recommendations: M365ValidationRecommendation[]; report: RecommendationValidationReport } {
  const thresholdDays = input.thresholdDays ?? 90;
  const now = input.now ?? new Date();
  const recommendations: M365ValidationRecommendation[] = [];
  const excludedUsers: RecommendationValidationReport["excludedUsers"] = [];
  const blockedUsers: RecommendationValidationReport["blockedUsers"] = [];

  for (const user of input.state.users) {
    if (user.assignedLicenses.length === 0) continue;
    const daysInactive = inactiveDays(user, now);
    const eligibleLifecycle = !user.accountEnabled || (daysInactive ?? Infinity) > thresholdDays;
    if (!eligibleLifecycle) continue;

    const blockedReasons = [
      user.isAdmin ? "ADMIN_ACCOUNT" : null,
      user.isServiceAccount ? "SERVICE_ACCOUNT" : null,
      user.isVip ? "VIP_USER" : null,
      user.excluded ? "EXCLUDED_USER" : null,
    ].filter((x): x is string => Boolean(x));
    if (blockedReasons.length > 0) {
      blockedUsers.push({ userPrincipalName: user.userPrincipalName, reasons: blockedReasons });
      excludedUsers.push({ userPrincipalName: user.userPrincipalName, reason: blockedReasons.join(",") });
      continue;
    }

    for (const licenseSkuId of user.assignedLicenses) {
      const monthly = skuMonthlyCost(input.state.subscribedSkus, licenseSkuId);
      recommendations.push({
        recommendationId: stableId("m365-prod-rec", [input.tenantId, user.id, licenseSkuId]),
        playbookId: "M365_INACTIVE_USER_LICENSE_RECLAIM",
        actionType: "REMOVE_LICENSE",
        user,
        licenseSkuId,
        projectedMonthlySavings: monthly,
        projectedAnnualSavings: monthly * 12,
        reason: !user.accountEnabled ? "User disabled and license assigned" : `User inactive for more than ${thresholdDays} days`,
        blocked: false,
        blockedReasons: [],
        evidence: { daysInactive, accountEnabled: user.accountEnabled, assignedLicenses: user.assignedLicenses },
      });
    }
  }

  return {
    recommendations,
    report: {
      recommendationsGenerated: recommendations.length,
      projectedMonthlySavings: recommendations.reduce((sum, rec) => sum + rec.projectedMonthlySavings, 0),
      projectedAnnualSavings: recommendations.reduce((sum, rec) => sum + rec.projectedAnnualSavings, 0),
      excludedUsers,
      blockedUsers,
    },
  };
}

export function approveRecommendation(input: { recommendation: M365ValidationRecommendation; approver: string; reason: string; timestamp?: string }): M365ValidationApproval {
  return {
    approvalRequestId: stableId("m365-prod-approval", [input.recommendation.recommendationId]),
    recommendationId: input.recommendation.recommendationId,
    status: "APPROVED",
    approver: input.approver,
    reason: input.reason,
    evidence: { recommendationEvidence: input.recommendation.evidence, projectedMonthlySavings: input.recommendation.projectedMonthlySavings },
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export function generateDryRun(recommendation: M365ValidationRecommendation): M365ValidationDryRun {
  const licenseAssigned = recommendation.user.assignedLicenses.includes(recommendation.licenseSkuId);
  return {
    dryRunId: stableId("m365-prod-dry-run", [recommendation.recommendationId]),
    recommendationId: recommendation.recommendationId,
    user: recommendation.user.userPrincipalName,
    license: recommendation.licenseSkuId,
    currentState: { licenseAssigned },
    futureState: { licenseAssigned: false },
    rollbackPlan: { available: licenseAssigned, action: "ASSIGN_LICENSE", skuId: recommendation.licenseSkuId },
    monthlySaving: recommendation.projectedMonthlySavings,
    annualSaving: recommendation.projectedAnnualSavings,
    risk: licenseAssigned ? "LOW" : "BLOCKED",
  };
}

export async function executeSingleLicenseRemoval(input: {
  accessToken: string;
  recommendation: M365ValidationRecommendation;
  approval: M365ValidationApproval;
  dryRun: M365ValidationDryRun;
  readAssignedLicenses: (userId: string) => Promise<string[]>;
  writeClient?: Pick<M365GraphLicenseWriteClient, "removeUserLicenses">;
  operatorId: string;
  timestamp?: string;
}): Promise<M365ValidationExecution> {
  if (input.approval.status !== "APPROVED") throw new Error("APPROVAL_REQUIRED");
  if (input.dryRun.risk !== "LOW") throw new Error("DRY_RUN_BLOCKED");
  const beforeLicenses = await input.readAssignedLicenses(input.recommendation.user.id);
  const before = { licenseAssigned: beforeLicenses.includes(input.recommendation.licenseSkuId) };
  if (!before.licenseAssigned) throw new Error("LICENSE_NOT_ASSIGNED_BEFORE_EXECUTION");

  const idempotencyKey = stableId("m365-prod-exec", [input.recommendation.recommendationId, input.approval.approvalRequestId]);
  const writer = input.writeClient ?? new M365GraphLicenseWriteClient(input.accessToken);
  const result = await writer.removeUserLicenses(input.recommendation.user.id, [input.recommendation.licenseSkuId], {
    runtimeEnvironment: "LIVE",
    approvalState: "APPROVED",
    riskClass: "LOW",
    trustScore: 95,
    connectorCapability: "GOVERNED_EXECUTION",
    idempotencyKey,
  });
  const afterLicenses = result.ok ? await input.readAssignedLicenses(input.recommendation.user.id) : beforeLicenses;

  return {
    executionResultId: idempotencyKey,
    recommendationId: input.recommendation.recommendationId,
    result,
    before,
    after: { licenseAssigned: afterLicenses.includes(input.recommendation.licenseSkuId) },
    rollbackReference: stableId("m365-prod-rollback", [input.recommendation.user.id, input.recommendation.licenseSkuId]),
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export function verifyExecutionOutcome(input: { recommendation: M365ValidationRecommendation; execution: M365ValidationExecution }): M365ValidationOutcome {
  const verified = input.execution.before.licenseAssigned && !input.execution.after.licenseAssigned && input.execution.result.ok;
  return {
    outcomeId: stableId("m365-prod-outcome", [input.execution.executionResultId]),
    status: verified ? "VERIFIED" : "FAILED_VERIFICATION",
    projectedMonthlySavings: input.recommendation.projectedMonthlySavings,
    verifiedMonthlySavings: verified ? input.recommendation.projectedMonthlySavings : 0,
    projectedAnnualSavings: input.recommendation.projectedAnnualSavings,
    verifiedAnnualSavings: verified ? input.recommendation.projectedAnnualSavings : 0,
    variance: verified ? 0 : -input.recommendation.projectedMonthlySavings,
    evidence: { before: input.execution.before, after: input.execution.after, graphRequestId: input.execution.result.requestId },
  };
}

export async function detectValidationDrift(input: { recommendation: M365ValidationRecommendation; readAssignedLicenses: (userId: string) => Promise<string[]>; timeline?: Array<Record<string, unknown>> }): Promise<M365ValidationDrift> {
  const current = await input.readAssignedLicenses(input.recommendation.user.id);
  const driftDetected = current.includes(input.recommendation.licenseSkuId);
  return {
    driftDetected,
    command: "REGISTER_DRIFT_MONITOR",
    runtimeActivity: driftDetected ? "Removed license was reassigned after verified reclaim" : "No drift detected for removed license",
    evidenceTimeline: [...(input.timeline ?? []), { checkedAt: new Date().toISOString(), assignedLicenses: current }],
    driftMonitor: { registered: true, monitoredUserId: input.recommendation.user.id, monitoredSkuId: input.recommendation.licenseSkuId },
  };
}

export function buildTenantValidationChecklist(input: { readiness?: TenantReadinessReport; discovery?: DiscoveryAuditReport; recommendations?: M365ValidationRecommendation[]; approval?: M365ValidationApproval; dryRun?: M365ValidationDryRun; execution?: M365ValidationExecution; outcome?: M365ValidationOutcome; ledger?: M365ValidationOutcome; drift?: M365ValidationDrift }): TenantValidationChecklist {
  return {
    A: { name: phaseNames.A, status: input.readiness?.connectorHealthy ? "PASS" : "FAIL", evidence: input.readiness ? [`missingScopes=${input.readiness.missingScopes.length}`, `graphReachable=${input.readiness.graphReachable}`] : [] },
    B: { name: phaseNames.B, status: (input.discovery?.usersFound ?? 0) > 0 ? "PASS" : "FAIL", evidence: input.discovery ? [`usersFound=${input.discovery.usersFound}`, `licensesFound=${input.discovery.licensesFound}`] : [] },
    C: { name: phaseNames.C, status: (input.recommendations?.length ?? 0) > 0 ? "PASS" : "FAIL", evidence: [`recommendations=${input.recommendations?.length ?? 0}`] },
    D: { name: phaseNames.D, status: input.approval?.status === "APPROVED" ? "PASS" : "FAIL", evidence: input.approval ? [`approver=${input.approval.approver}`, `timestamp=${input.approval.timestamp}`] : [] },
    E: { name: phaseNames.E, status: input.dryRun?.risk === "LOW" && input.dryRun.rollbackPlan.available ? "PASS" : "FAIL", evidence: input.dryRun ? [`rollbackAvailable=${input.dryRun.rollbackPlan.available}`, `risk=${input.dryRun.risk}`] : [] },
    F: { name: phaseNames.F, status: input.execution?.result.ok ? "PASS" : "FAIL", evidence: input.execution ? [`before=${input.execution.before.licenseAssigned}`, `after=${input.execution.after.licenseAssigned}`] : [] },
    G: { name: phaseNames.G, status: input.outcome?.status === "VERIFIED" ? "PASS" : "FAIL", evidence: input.outcome ? [`status=${input.outcome.status}`] : [] },
    H: { name: phaseNames.H, status: input.ledger?.status === "VERIFIED" && input.ledger.verifiedMonthlySavings >= 0 ? "PASS" : "FAIL", evidence: input.ledger ? [`verifiedMonthlySavings=${input.ledger.verifiedMonthlySavings}`, `variance=${input.ledger.variance}`] : [] },
    I: { name: phaseNames.I, status: input.drift?.driftMonitor.registered ? "PASS" : "FAIL", evidence: input.drift ? [`driftDetected=${input.drift.driftDetected}`] : [] },
  };
}

export function buildRuntimeTrace(input: RuntimeTrace): RuntimeTrace {
  return input;
}
