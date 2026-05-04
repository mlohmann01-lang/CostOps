import type { NormalizedM365User } from "./types";

export function normalizeM365Users(tenantId: string, rawUsers: any[], sourceTimestamp: string): NormalizedM365User[] {
  return rawUsers.map((u) => ({
    tenantId,
    userPrincipalName: u.userPrincipalName,
    displayName: u.displayName,
    accountEnabled: Boolean(u.accountEnabled),
    assignedLicenses: Array.isArray(u.assignedLicenses) ? u.assignedLicenses : [],
    lastLoginDaysAgo: typeof u.lastLoginDaysAgo === "number" ? u.lastLoginDaysAgo : null,
    sourceTimestamp,
    sourceSystem: "M365_GRAPH",
  }));
}
