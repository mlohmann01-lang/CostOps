import test from "node:test";
import assert from "node:assert/strict";
import {
  M365_PRODUCTION_FAILURE_MATRIX,
  buildDiscoveryAuditReport,
  buildRuntimeTrace,
  buildTenantReadinessReport,
  buildTenantValidationChecklist,
  detectValidationDrift,
  executeSingleLicenseRemoval,
  generateDryRun,
  generateInactiveUserLicenseRecommendations,
  approveRecommendation,
  verifyExecutionOutcome,
  type M365DiscoveredTenantState,
} from "../lib/connectors/m365/m365-production-validation";

const state: M365DiscoveredTenantState = {
  lastSync: "2026-05-30T00:00:00.000Z",
  groups: [{ id: "group-1", displayName: "Finance" }],
  subscribedSkus: [{ skuId: "sku-e3", skuPartNumber: "SPE_E3", monthlyCost: 36 }],
  users: [
    {
      id: "user-inactive",
      userPrincipalName: "inactive@contoso.com",
      displayName: "Inactive User",
      accountEnabled: true,
      assignedLicenses: ["sku-e3"],
      lastSignInAt: "2026-01-01T00:00:00.000Z",
      department: "Finance",
      costCentre: "CC-100",
    },
    {
      id: "admin-disabled",
      userPrincipalName: "admin@contoso.com",
      displayName: "Admin Disabled",
      accountEnabled: false,
      assignedLicenses: ["sku-e3"],
      isAdmin: true,
    },
    {
      id: "active-user",
      userPrincipalName: "active@contoso.com",
      displayName: "Active User",
      accountEnabled: true,
      assignedLicenses: [],
      lastSignInAt: "2026-05-29T00:00:00.000Z",
    },
  ],
};

test("tenant readiness requires the full Phase 8 M365 scope wedge and never silently degrades", () => {
  const missing = buildTenantReadinessReport({ tokenAcquired: true, graphReachable: true, grantedScopes: ["User.Read.All"] });
  assert.equal(missing.connectorHealthy, false);
  assert.deepEqual(missing.missingScopes, ["Directory.Read.All", "Organization.Read.All", "AuditLog.Read.All", "Reports.Read.All"]);

  const ready = buildTenantReadinessReport({
    tokenAcquired: true,
    graphReachable: true,
    grantedScopes: ["User.Read.All", "Directory.Read.All", "Organization.Read.All", "AuditLog.Read.All", "Reports.Read.All"],
  });
  assert.equal(ready.connectorHealthy, true);
  assert.equal(ready.scopesValid, true);
});

test("discovery audit reports tenant-facing counts for users, licenses, groups, departments and cost centres", () => {
  const audit = buildDiscoveryAuditReport(state, 90, new Date("2026-05-30T00:00:00.000Z"));
  assert.equal(audit.usersFound, 3);
  assert.equal(audit.licensesFound, 1);
  assert.equal(audit.activeUsers, 2);
  assert.equal(audit.inactiveUsers, 1);
  assert.equal(audit.disabledUsers, 1);
  assert.equal(audit.groupsFound, 1);
  assert.equal(audit.departmentsFound, 1);
  assert.equal(audit.costCentresFound, 1);
});

test("recommendation validation only emits inactive-user license reclaim and blocks admins", () => {
  const { recommendations, report } = generateInactiveUserLicenseRecommendations({ tenantId: "tenant-a", state, thresholdDays: 90, now: new Date("2026-05-30T00:00:00.000Z") });
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].playbookId, "M365_INACTIVE_USER_LICENSE_RECLAIM");
  assert.equal(recommendations[0].actionType, "REMOVE_LICENSE");
  assert.equal(recommendations[0].projectedMonthlySavings, 36);
  assert.equal(report.projectedAnnualSavings, 432);
  assert.deepEqual(report.blockedUsers, [{ userPrincipalName: "admin@contoso.com", reasons: ["ADMIN_ACCOUNT"] }]);
});

test("approval, dry run, single execution, verification, ledger and drift produce the required one-user trace", async () => {
  process.env.ENABLE_LIVE_M365_EXECUTION = "true";
  const readiness = buildTenantReadinessReport({
    tokenAcquired: true,
    graphReachable: true,
    grantedScopes: ["User.Read.All", "Directory.Read.All", "Organization.Read.All", "AuditLog.Read.All", "Reports.Read.All"],
  });
  const discovery = buildDiscoveryAuditReport(state, 90, new Date("2026-05-30T00:00:00.000Z"));
  const { recommendations } = generateInactiveUserLicenseRecommendations({ tenantId: "tenant-a", state, now: new Date("2026-05-30T00:00:00.000Z") });
  const recommendation = recommendations[0];
  const approval = approveRecommendation({ recommendation, approver: "ops@example.com", reason: "Phase 8 controlled validation", timestamp: "2026-05-30T01:00:00.000Z" });
  const dryRun = generateDryRun(recommendation);

  let assigned = ["sku-e3"];
  const execution = await executeSingleLicenseRemoval({
    accessToken: "token",
    recommendation,
    approval,
    dryRun,
    operatorId: "operator@example.com",
    readAssignedLicenses: async () => assigned,
    writeClient: {
      removeUserLicenses: async (_userId, skuIds) => {
        assigned = assigned.filter((sku) => !skuIds.includes(sku));
        return { ok: true, status: "LIVE_EXECUTION_SUBMITTED", requestId: "graph-request-1", httpStatus: 200, evidence: { skuIds } };
      },
    },
    timestamp: "2026-05-30T01:05:00.000Z",
  });
  const outcome = verifyExecutionOutcome({ recommendation, execution });
  const ledger = outcome;

  assigned = ["sku-e3"];
  const drift = await detectValidationDrift({ recommendation, readAssignedLicenses: async () => assigned, timeline: [outcome.evidence] });
  const checklist = buildTenantValidationChecklist({ readiness, discovery, recommendations, approval, dryRun, execution, outcome, ledger, drift });
  const trace = buildRuntimeTrace({ discovery, recommendation, approval, dryRun, execution, verification: outcome, ledger, drift });

  assert.equal(execution.before.licenseAssigned, true);
  assert.equal(execution.after.licenseAssigned, false);
  assert.equal(outcome.status, "VERIFIED");
  assert.equal(outcome.verifiedAnnualSavings, 432);
  assert.equal(drift.driftDetected, true);
  assert.deepEqual(Object.values(checklist).map((phase) => phase.status), ["PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS"]);
  assert.equal(trace.recommendation?.user.userPrincipalName, "inactive@contoso.com");
});

test("failure matrix covers all required Phase 8 failure modes with no autonomous mutation", () => {
  const codes = M365_PRODUCTION_FAILURE_MATRIX.map((row) => row.code).sort();
  assert.deepEqual(codes, ["GRAPH_TIMEOUT", "LICENSE_REMOVAL_FAILURE", "MISSING_SCOPE", "PERMISSION_FAILURE", "ROLLBACK_FAILURE", "VERIFICATION_FAILURE"].sort());
  assert.ok(M365_PRODUCTION_FAILURE_MATRIX.every((row) => row.autonomousMutation === false));
});
