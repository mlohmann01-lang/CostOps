export type M365EvidenceRecord = {
  userId: string; displayName: string | null; department: string | null; costCentre: string | null; assignedLicences: string[];
  monthlyLicenceCost: number; lastSignInAt: string | null; lastActivityAt: string | null; accountStatus: string; mailboxType: string;
  copilotActivity: Record<string, unknown>; addOnUsage: Record<string, unknown>; desktopAppUsage: Record<string, unknown>;
  isAdmin: boolean; isServiceAccount: boolean; evidenceCompleteness: number; evidenceFreshness: number; sourceSystem: string;
};

export class M365EvidenceNormalizationService {
  normalize(input: { users: any[]; assignedLicences: any[]; skuData: any[]; activitySignals: any[]; mailboxSignals: any[]; serviceUsageSignals: any[]; }): M365EvidenceRecord[] {
    const licenceByUpn = new Map(input.assignedLicences.map((x) => [x.userPrincipalName, (x.assignedLicenses ?? []).map((l: any) => l.skuId).filter(Boolean)]));
    return input.users.map((u) => ({
      userId: u.userPrincipalName ?? u.id,
      displayName: u.displayName ?? null,
      department: u.department ?? null,
      costCentre: null,
      assignedLicences: licenceByUpn.get(u.userPrincipalName) ?? [],
      monthlyLicenceCost: 0,
      lastSignInAt: u.signInActivity?.lastSignInDateTime ?? null,
      lastActivityAt: u.signInActivity?.lastSignInDateTime ?? null,
      accountStatus: u.accountEnabled ? "ACTIVE" : "DISABLED",
      mailboxType: "user",
      copilotActivity: {}, addOnUsage: {}, desktopAppUsage: {},
      isAdmin: (u.userPrincipalName ?? "").includes("admin"),
      isServiceAccount: (u.userPrincipalName ?? "").includes("service"),
      evidenceCompleteness: 0.8, evidenceFreshness: 0.8, sourceSystem: "M365_GRAPH",
    }));
  }
}
