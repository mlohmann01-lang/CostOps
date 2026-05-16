import { db, governancePolicyEngineTable, operatorActivityEventsTable, pilotProfilesTable, tenantOnboardingTable, workflowItemsTable } from "@workspace/db";

export class TenantProvisioningService {
  async provision(input: { tenantName: string; tenantSlug: string; adminEmail: string; environment: string; actorId: string }) {
    const tenantId = input.tenantSlug;
    await db.insert(tenantOnboardingTable).values({ tenantId, currentStep: "TENANT_SETUP", completedSteps: ["TENANT_SETUP", "ADMIN_SETUP"], connectorStatuses: { m365: "NOT_CONFIGURED" }, readinessSummary: { tenantName: input.tenantName, adminEmail: input.adminEmail, environment: input.environment, tenantType: "PILOT" }, onboardingStatus: "IN_PROGRESS" }).onConflictDoUpdate({ target: tenantOnboardingTable.tenantId, set: { updatedAt: new Date() } });
    await db.insert(governancePolicyEngineTable).values({ tenantId, policyKey: "default-approval-policy", policyName: "Default Approval Governance", policyCategory: "WORKFLOW", policyStatus: "ACTIVE", policyVersion: "v1", scopeType: "TENANT", policyDefinition: { requireApprovalFor: ["REMOVE_LICENSE", "DOWNGRADE_LICENSE"] }, policyMetadata: { createdByProvisioning: true } }).onConflictDoNothing();
    await db.insert(workflowItemsTable).values({ tenantId, workflowType: "TENANT_ONBOARDING", targetType: "TENANT", targetId: tenantId, status: "OPEN", priorityBand: "MEDIUM", slaStatus: "HEALTHY", assignedTeam: "OPERATIONS" }).onConflictDoNothing();
    await db.insert(pilotProfilesTable).values({ tenantId, enabledConnectors: ["m365"], enabledPlaybooks: [], defaultTrustThresholds: { minimumTrustScore: 0.8 }, approvalRequirements: { requireApproval: true }, telemetryRetentionDays: "30", workflowSlaDefaults: { triageHours: 24 }, policyExceptionDefaults: { maxDurationDays: 7 }, demoMode: "false" }).onConflictDoNothing();
    await db.insert(operatorActivityEventsTable).values({ tenantId, operatorId: input.actorId, activityType: "TENANT_PROVISIONED", targetType: "TENANT", targetId: tenantId, activityMetadata: { tenantName: input.tenantName, adminEmail: input.adminEmail, environment: input.environment } });
    return { tenantId, status: "PROVISIONED" };
  }
}
