import { getGraphAccessToken } from "./m365-graph-client";
import { M365GraphReadOnlyClient } from "./m365-graph-read-only-client";
import { checkM365PermissionReadiness } from "./m365-permission-check";
import { evaluateM365ConnectorReadiness, type M365ConnectorState } from "../m365-operationalization";

export type EvidenceFreshnessState = "FRESH" | "STALE" | "MISSING" | "PARTIAL";

export type M365RawUserEvidence = { id: string; displayName?: string; mail?: string; userPrincipalName: string; accountEnabled?: boolean; createdDateTime?: string; assignedLicenses?: Array<{ skuId?: string }>; department?: string; jobTitle?: string; usageLocation?: string; signInActivity?: { lastSignInDateTime?: string; lastNonInteractiveSignInDateTime?: string }; sourceTimestamp: string };
export type M365RawSkuEvidence = { skuId: string; skuPartNumber?: string; prepaidUnits?: Record<string, number>; consumedUnits?: number; servicePlans?: Array<{ servicePlanName?: string }>; sourceTimestamp: string };
export type M365RawProtectionEvidence = { groupIds: string[]; groupDisplayNames: string[]; directoryRoleIds: string[]; directoryRoleNames: string[]; isAdminProtected: boolean; isServiceAccountCandidate: boolean; exclusionReason?: string; sourceTimestamp: string };

export type M365NormalizedUserLicenseEvidence = { tenantId: string; userId: string; userPrincipalName: string; displayName: string; accountEnabled: boolean; assignedSkuIds: string[]; assignedSkuNames: string[]; assignedLicenseCount: number; lastSignInDateTime: string | null; lastNonInteractiveSignInDateTime: string | null; inactivityDays: number | null; evidenceFreshness: EvidenceFreshnessState; evidenceFreshnessReason: string; evidenceConfidence: number; isDisabledLicensedUser: boolean; isInactiveLicensedUser: boolean; isAdminProtected: boolean; isServiceAccountCandidate: boolean; exclusionReasons: string[]; sourceEvidenceIds: string[]; normalizedAt: string };

export type M365ReadOnlyEvidenceSyncSummary = { tenantId: string; syncStartedAt: string; syncCompletedAt: string; usersScanned: number; licensedUsersFound: number; disabledLicensedUsersFound: number; inactiveLicensedUsersFound: number; excludedUsers: number; evidenceFreshness: EvidenceFreshnessState; connectorReadiness: M365ConnectorState; errors: string[]; warnings: string[] };

const inactivityDaysThreshold = 45;
const staleDaysThreshold = 30;

function freshnessForUser(user: M365RawUserEvidence, hasSkuEvidence: boolean): { state: EvidenceFreshnessState; reason: string; inactivityDays: number | null } {
  const signIn = user.signInActivity?.lastSignInDateTime ?? null;
  const nonInteractive = user.signInActivity?.lastNonInteractiveSignInDateTime ?? null;
  if (!hasSkuEvidence && !signIn && !nonInteractive) return { state: "MISSING", reason: "MISSING_SIGNIN_AND_SKU", inactivityDays: null };
  if (!signIn && !nonInteractive) return { state: "PARTIAL", reason: "MISSING_SIGNIN_ACTIVITY", inactivityDays: null };
  const ts = signIn ?? nonInteractive;
  const days = ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86400000) : null;
  if (days == null || Number.isNaN(days)) return { state: "PARTIAL", reason: "INVALID_SIGNIN_TIMESTAMP", inactivityDays: null };
  if (days > staleDaysThreshold) return { state: "STALE", reason: `SIGNIN_OLDER_THAN_${staleDaysThreshold}_DAYS`, inactivityDays: days };
  return { state: "FRESH", reason: "SIGNIN_AND_SKU_CURRENT", inactivityDays: days };
}

export class M365ReadOnlyEvidenceSyncService {
  async runSync(tenantId: string): Promise<{ summary: M365ReadOnlyEvidenceSyncSummary; normalizedEvidence: M365NormalizedUserLicenseEvidence[] }> {
    const syncStartedAt = new Date().toISOString();
    const readiness = await checkM365PermissionReadiness();
    const token = await getGraphAccessToken();

    const readinessState = evaluateM365ConnectorReadiness({
      authSucceeded: Boolean(token.accessToken),
      tenantReachable: Boolean(token.accessToken),
      grantedScopes: (readiness.evidence.grantedPermissions as string[] | undefined) ?? [],
      requiredScopes: ["User.Read.All", "Directory.Read.All", "Organization.Read.All"],
      activityEndpointAccessible: Boolean(token.accessToken),
      licenceEndpointAccessible: Boolean(token.accessToken),
      evidenceFreshnessHours: 1,
      maxFreshnessHours: 24,
      tenantMode: process.env.ECON_OPS_TENANT_MODE ?? "PILOT_READ_ONLY",
      writeCapabilitiesRequested: false,
    }).state;

    if (!token.accessToken || ["AUTH_FAILED", "MISSING_SCOPES", "INSUFFICIENT_PERMISSIONS", "BLOCKED_BY_TENANT_MODE"].includes(readinessState)) {
      return {
        summary: { tenantId, syncStartedAt, syncCompletedAt: new Date().toISOString(), usersScanned: 0, licensedUsersFound: 0, disabledLicensedUsersFound: 0, inactiveLicensedUsersFound: 0, excludedUsers: 0, evidenceFreshness: "MISSING", connectorReadiness: readinessState, errors: [token.error ?? readinessState], warnings: readiness.warnings },
        normalizedEvidence: [],
      };
    }

    const client = new M365GraphReadOnlyClient(token.accessToken, { tenantId, timeoutMs: 15000 });
    const users = await client.listUsers() as M365RawUserEvidence[];
    const skus = await client.listSubscribedSkus() as M365RawSkuEvidence[];
    const groups = await client.listGroups() as Array<{ id: string; displayName?: string }>;
    const roles = await client.listDirectoryRoles() as Array<{ id: string; displayName?: string }>;

    const skuNames = new Map(skus.map((s) => [s.skuId, s.skuPartNumber ?? s.skuId]));
    const now = new Date().toISOString();
    const normalizedEvidence = users.map((u) => {
      const assignedSkuIds = (u.assignedLicenses ?? []).map((x) => x.skuId).filter((x): x is string => Boolean(x));
      const protection: M365RawProtectionEvidence = {
        groupIds: groups.map((g) => g.id), groupDisplayNames: groups.map((g) => g.displayName ?? g.id), directoryRoleIds: roles.map((r) => r.id), directoryRoleNames: roles.map((r) => r.displayName ?? r.id),
        isAdminProtected: /admin/i.test(u.userPrincipalName) || /admin/i.test(u.displayName ?? ""),
        isServiceAccountCandidate: /(service|noreply|no-reply)/i.test(u.userPrincipalName),
        exclusionReason: undefined, sourceTimestamp: now,
      };
      const freshness = freshnessForUser(u, skus.length > 0);
      const exclusionReasons = [
        ...(protection.isAdminProtected ? ["ADMIN_PROTECTED"] : []),
        ...(protection.isServiceAccountCandidate ? ["SERVICE_ACCOUNT_CANDIDATE"] : []),
      ];
      const assignedLicenseCount = assignedSkuIds.length;
      return {
        tenantId,
        userId: u.id,
        userPrincipalName: u.userPrincipalName,
        displayName: u.displayName ?? u.userPrincipalName,
        accountEnabled: Boolean(u.accountEnabled),
        assignedSkuIds,
        assignedSkuNames: assignedSkuIds.map((id) => skuNames.get(id) ?? id),
        assignedLicenseCount,
        lastSignInDateTime: u.signInActivity?.lastSignInDateTime ?? null,
        lastNonInteractiveSignInDateTime: u.signInActivity?.lastNonInteractiveSignInDateTime ?? null,
        inactivityDays: freshness.inactivityDays,
        evidenceFreshness: freshness.state,
        evidenceFreshnessReason: freshness.reason,
        evidenceConfidence: freshness.state === "FRESH" ? 0.95 : freshness.state === "STALE" ? 0.7 : freshness.state === "PARTIAL" ? 0.5 : 0.3,
        isDisabledLicensedUser: Boolean(u.accountEnabled === false && assignedLicenseCount > 0),
        isInactiveLicensedUser: Boolean((freshness.inactivityDays ?? 0) >= inactivityDaysThreshold && assignedLicenseCount > 0),
        isAdminProtected: protection.isAdminProtected,
        isServiceAccountCandidate: protection.isServiceAccountCandidate,
        exclusionReasons,
        sourceEvidenceIds: [`user:${u.id}`, ...assignedSkuIds.map((x) => `sku:${x}`)],
        normalizedAt: now,
      } satisfies M365NormalizedUserLicenseEvidence;
    });

    const licensedUsers = normalizedEvidence.filter((u) => u.assignedLicenseCount > 0);
    const freshness = normalizedEvidence.some((u) => u.evidenceFreshness === "MISSING") ? "MISSING" : normalizedEvidence.some((u) => u.evidenceFreshness === "PARTIAL") ? "PARTIAL" : normalizedEvidence.some((u) => u.evidenceFreshness === "STALE") ? "STALE" : "FRESH";

    return {
      summary: {
        tenantId,
        syncStartedAt,
        syncCompletedAt: new Date().toISOString(),
        usersScanned: normalizedEvidence.length,
        licensedUsersFound: licensedUsers.length,
        disabledLicensedUsersFound: licensedUsers.filter((u) => u.isDisabledLicensedUser).length,
        inactiveLicensedUsersFound: licensedUsers.filter((u) => u.isInactiveLicensedUser).length,
        excludedUsers: normalizedEvidence.filter((u) => u.exclusionReasons.length > 0).length,
        evidenceFreshness: freshness,
        connectorReadiness: readinessState,
        errors: [],
        warnings: readiness.warnings,
      },
      normalizedEvidence,
    };
  }
}
