import { randomUUID } from "node:crypto";
import { freshnessBandFromDays, freshnessScoreFromBand } from "./connector-health";
import { normalizeM365Users } from "./m365-normalizer";
import type { M365IngestionResult } from "./types";
import { fetchGraphUserActivity, fetchGraphUserLicences, fetchGraphUsers, getGraphAccessToken } from "./m365/m365-graph-client";
import { checkM365PermissionReadiness } from "./m365/m365-permission-check";

const MOCK_USERS = [
  { userPrincipalName: "john.smith@contoso.com", displayName: "John Smith", accountEnabled: false, assignedLicenses: ["E5"], lastLoginDaysAgo: 120 },
  { userPrincipalName: "dev.service@contoso.com", displayName: "Dev Service", accountEnabled: false, assignedLicenses: ["E3"], lastLoginDaysAgo: 300 },
  { userPrincipalName: "noreply.shared@contoso.com", displayName: "No Reply", accountEnabled: false, assignedLicenses: ["E3"], lastLoginDaysAgo: null },
];

function buildResult(tenantId: string, sourceTimestamp: string, usersRaw: any[], partialData: boolean, requestId?: string, error?: { code: string; message: string }): M365IngestionResult {
  const users = normalizeM365Users(tenantId, usersRaw, sourceTimestamp);
  const maxDays = users.reduce((m, u) => (u.lastLoginDaysAgo && u.lastLoginDaysAgo > m ? u.lastLoginDaysAgo : m), 0);
  const band = freshnessBandFromDays(maxDays || null);
  const health = error ? "FAILED" : partialData ? "DEGRADED" : "HEALTHY";
  return {
    users,
    metadata: {
      tenantId,
      connector: "M365_GRAPH",
      connectorHealth: health,
      lastSyncTime: sourceTimestamp,
      dataFreshnessScore: error ? 0 : freshnessScoreFromBand(band),
      freshnessBand: band,
      partialData,
      requestId: requestId ?? randomUUID(),
      errorCode: error?.code,
      errorMessage: error?.message,
    },
    warnings: partialData ? ["Partial activity data returned by connector"] : error ? [error.message] : [],
    ingestionRunId: randomUUID(),
  };
}

export async function ingestM365Tenant(tenantId: string): Promise<M365IngestionResult> {
  const sourceTimestamp = new Date().toISOString();
  const mode = process.env.M365_MODE ?? "MOCK_CONNECTOR";

  if (mode === "MOCK_CONNECTOR") {
    const partialData = MOCK_USERS.some((u) => u.lastLoginDaysAgo == null);
    return buildResult(tenantId, sourceTimestamp, MOCK_USERS, partialData);
  }

  if (mode !== "LIVE_GRAPH") {
    return buildResult(tenantId, sourceTimestamp, [], false, undefined, { code: "INVALID_M365_MODE", message: `Unsupported M365_MODE: ${mode}` });
  }

  try {
    const readiness = await checkM365PermissionReadiness();
    if (readiness.status === "BLOCKED") {
      return buildResult(tenantId, sourceTimestamp, [], false, undefined, {
        code: "PERMISSION_BLOCKED",
        message: JSON.stringify({ warnings: readiness.warnings, missingRequired: readiness.missingRequired, evidence: readiness.evidence }),
      });
    }

    const token = await getGraphAccessToken();
    if (!token.accessToken) {
      return buildResult(tenantId, sourceTimestamp, [], false, token.requestId, { code: token.error ?? "TOKEN_ERROR", message: "Unable to obtain Graph token" });
    }

    const usersResult = await fetchGraphUsers(token.accessToken);
    const licencesResult = await fetchGraphUserLicences(token.accessToken, usersResult.users);

    let partialData = false;
    let activityByUpn: Record<string, number | null> = {};
    let activityRequestId: string | undefined;
    try {
      const activityResult = await fetchGraphUserActivity(token.accessToken, usersResult.users);
      activityByUpn = activityResult.lastLoginDaysByUpn;
      activityRequestId = activityResult.requestId;
    } catch {
      partialData = true;
    }

    const merged = usersResult.users.map((u) => ({
      userPrincipalName: u.userPrincipalName,
      displayName: u.displayName,
      accountEnabled: Boolean(u.accountEnabled),
      assignedLicenses: licencesResult.licencesByUpn[u.userPrincipalName] ?? (u.assignedLicenses ?? []).map((x) => x.skuId).filter((x): x is string => Boolean(x)),
      lastLoginDaysAgo: Object.prototype.hasOwnProperty.call(activityByUpn, u.userPrincipalName) ? activityByUpn[u.userPrincipalName] : null,
    }));

    const requestId = activityRequestId ?? licencesResult.requestId ?? usersResult.requestId ?? token.requestId;
    const result = buildResult(tenantId, sourceTimestamp, merged, partialData || readiness.status === "DEGRADED", requestId);
    if (readiness.status === "DEGRADED") {
      result.metadata.connectorHealth = "DEGRADED";
      result.metadata.errorCode = "PERMISSION_DEGRADED";
      result.metadata.errorMessage = JSON.stringify({ warnings: readiness.warnings, missingOptional: readiness.missingOptional, evidence: readiness.evidence });
      result.warnings = [...result.warnings, ...readiness.warnings];
    }
    return result;
  } catch (error) {
    return buildResult(tenantId, sourceTimestamp, [], false, undefined, { code: "GRAPH_INGESTION_FAILED", message: error instanceof Error ? error.message : "Unknown Graph ingestion error" });
  }
}
