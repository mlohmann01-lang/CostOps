import { randomUUID } from "node:crypto";
import { freshnessBandFromDays, freshnessScoreFromBand } from "./connector-health";
import { normalizeM365Users } from "./m365-normalizer";
import type { M365IngestionResult } from "./types";

const MOCK_USERS = [
  { userPrincipalName: "john.smith@contoso.com", displayName: "John Smith", accountEnabled: false, assignedLicenses: ["E5"], lastLoginDaysAgo: 120 },
  { userPrincipalName: "dev.service@contoso.com", displayName: "Dev Service", accountEnabled: false, assignedLicenses: ["E3"], lastLoginDaysAgo: 300 },
  { userPrincipalName: "noreply.shared@contoso.com", displayName: "No Reply", accountEnabled: false, assignedLicenses: ["E3"], lastLoginDaysAgo: null },
];

export async function ingestM365Tenant(tenantId: string): Promise<M365IngestionResult> {
  const sourceTimestamp = new Date().toISOString();
  const users = normalizeM365Users(tenantId, MOCK_USERS, sourceTimestamp);
  const maxDays = users.reduce((m, u) => (u.lastLoginDaysAgo && u.lastLoginDaysAgo > m ? u.lastLoginDaysAgo : m), 0);
  const band = freshnessBandFromDays(maxDays || null);
  const partialData = users.some((u) => u.lastLoginDaysAgo == null);

  return {
    users,
    metadata: {
      tenantId,
      connector: "M365_GRAPH",
      connectorHealth: partialData ? "DEGRADED" : "HEALTHY",
      lastSyncTime: sourceTimestamp,
      dataFreshnessScore: freshnessScoreFromBand(band),
      freshnessBand: band,
      partialData,
      requestId: randomUUID(),
    },
    warnings: partialData ? ["Partial activity data returned by connector"] : [],
    ingestionRunId: randomUUID(),
  };
}
