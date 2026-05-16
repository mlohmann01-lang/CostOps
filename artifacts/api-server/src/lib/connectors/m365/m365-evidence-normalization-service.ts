export type EvidenceFreshness = "FRESH" | "STALE" | "EXPIRED" | "UNKNOWN";
export const UNKNOWN = "UNKNOWN" as const;

export const EVIDENCE_FRESHNESS_THRESHOLDS_DAYS = {
  freshMax: 7,
  staleMax: 30,
} as const;

export function deriveEvidenceFreshness(sourceTimestamp?: string | null, now = new Date()): EvidenceFreshness {
  if (!sourceTimestamp) return "UNKNOWN";
  const ts = new Date(sourceTimestamp);
  if (Number.isNaN(ts.getTime())) return "UNKNOWN";
  const days = Math.floor((now.getTime() - ts.getTime()) / 86400000);
  if (days <= EVIDENCE_FRESHNESS_THRESHOLDS_DAYS.freshMax) return "FRESH";
  if (days <= EVIDENCE_FRESHNESS_THRESHOLDS_DAYS.staleMax) return "STALE";
  return "EXPIRED";
}

export type NormalizedM365User = {
  tenantId: string; userId: string; userPrincipalName: string; displayName: string; mail: string | typeof UNKNOWN;
  department: string | typeof UNKNOWN; jobTitle: string | typeof UNKNOWN; costCenter: string | typeof UNKNOWN; location: string | typeof UNKNOWN; userType: string | typeof UNKNOWN;
  accountEnabled: boolean | typeof UNKNOWN; isAdmin: boolean | typeof UNKNOWN; isPrivileged: boolean | typeof UNKNOWN; isServiceAccount: boolean | typeof UNKNOWN; isSharedMailbox: boolean | typeof UNKNOWN; isBreakGlassAccount: boolean | typeof UNKNOWN; isFrontlineWorker: boolean | typeof UNKNOWN;
  assignedSkuIds: string[]; assignedSkuNames: string[]; assignedServicePlans: string[]; licenseAssignmentSource: string | typeof UNKNOWN;
  lastSignInAt: string | null; lastActivityAt: string | null;
  desktopAppUsage: Record<string, unknown> | typeof UNKNOWN; webUsage: Record<string, unknown> | typeof UNKNOWN; mobileUsage: Record<string, unknown> | typeof UNKNOWN;
  outlookUsage: Record<string, unknown> | typeof UNKNOWN; teamsUsage: Record<string, unknown> | typeof UNKNOWN; onedriveUsage: Record<string, unknown> | typeof UNKNOWN; sharepointUsage: Record<string, unknown> | typeof UNKNOWN; exchangeUsage: Record<string, unknown> | typeof UNKNOWN;
  copilotUsage: Record<string, unknown> | typeof UNKNOWN; copilotActivityScore: number | typeof UNKNOWN;
  powerBiUsage: Record<string, unknown> | typeof UNKNOWN; visioUsage: Record<string, unknown> | typeof UNKNOWN; projectUsage: Record<string, unknown> | typeof UNKNOWN; teamsPhoneUsage: Record<string, unknown> | typeof UNKNOWN; audioConferencingUsage: Record<string, unknown> | typeof UNKNOWN;
  mailboxStorageBytes: number | typeof UNKNOWN; oneDriveStorageBytes: number | typeof UNKNOWN; sharePointStorageBytes: number | typeof UNKNOWN;
  legalHold: boolean | typeof UNKNOWN; retentionPolicy: string | typeof UNKNOWN; complianceFlags: string[] | typeof UNKNOWN;
  evidenceFreshness: EvidenceFreshness; sourceTimestamp: string | null; connectorHealth: "HEALTHY" | "DEGRADED" | "UNKNOWN";
  identityConfidence: number; licenseConfidence: number; usageConfidence: number; storageConfidence: number; pricingConfidence: number;
  sourceSystem: string;
  evidenceCompleteness: number;
};

export class M365EvidenceNormalizationService {
  normalize(input: { tenantId: string; users: any[]; assignedLicences: any[]; skuData: any[]; activitySignals: any[]; mailboxSignals: any[]; serviceUsageSignals: any[]; }): NormalizedM365User[] {
    const licenceByUpn = new Map(input.assignedLicences.map((x) => [x.userPrincipalName, (x.assignedLicenses ?? [])]));
    const usageByUpn = new Map(input.serviceUsageSignals.map((x) => [x.userPrincipalName, x]));
    const mailboxByUpn = new Map(input.mailboxSignals.map((x) => [x.userPrincipalName, x]));
    return input.users.map((u) => {
      const upn = u.userPrincipalName ?? u.mail ?? u.id;
      const assigned = licenceByUpn.get(upn) ?? [];
      const usage = usageByUpn.get(upn) ?? {};
      const mailbox = mailboxByUpn.get(upn) ?? {};
      const sourceTimestamp = u.signInActivity?.lastSignInDateTime ?? null;
      return {
        tenantId: input.tenantId,
        userId: u.id ?? upn,
        userPrincipalName: upn,
        displayName: u.displayName ?? upn,
        mail: u.mail ?? UNKNOWN,
        department: u.department ?? UNKNOWN,
        jobTitle: u.jobTitle ?? UNKNOWN,
        costCenter: u.costCenter ?? UNKNOWN,
        location: u.officeLocation ?? UNKNOWN,
        userType: u.userType ?? UNKNOWN,
        accountEnabled: typeof u.accountEnabled === "boolean" ? u.accountEnabled : UNKNOWN,
        isAdmin: upn.toLowerCase().includes("admin"),
        isPrivileged: upn.toLowerCase().includes("admin") || upn.toLowerCase().includes("priv"),
        isServiceAccount: upn.toLowerCase().includes("service") || upn.toLowerCase().includes("noreply") || upn.toLowerCase().includes("no-reply"),
        isSharedMailbox: mailbox.mailboxType === "shared" ? true : UNKNOWN,
        isBreakGlassAccount: upn.toLowerCase().includes("breakglass"),
        isFrontlineWorker: (u.department ?? "").toLowerCase().includes("frontline") ? true : UNKNOWN,
        assignedSkuIds: assigned.map((l: any) => l.skuId).filter(Boolean),
        assignedSkuNames: assigned.map((l: any) => l.skuPartNumber ?? l.skuName).filter(Boolean),
        assignedServicePlans: assigned.flatMap((l: any) => (l.servicePlans ?? []).map((s: any) => s.servicePlanName)).filter(Boolean),
        licenseAssignmentSource: "M365_GRAPH",
        lastSignInAt: sourceTimestamp,
        lastActivityAt: usage.lastActivityAt ?? sourceTimestamp,
        desktopAppUsage: usage.desktopAppUsage ?? UNKNOWN,
        webUsage: usage.webUsage ?? UNKNOWN,
        mobileUsage: usage.mobileUsage ?? UNKNOWN,
        outlookUsage: usage.outlookUsage ?? UNKNOWN,
        teamsUsage: usage.teamsUsage ?? UNKNOWN,
        onedriveUsage: usage.onedriveUsage ?? UNKNOWN,
        sharepointUsage: usage.sharepointUsage ?? UNKNOWN,
        exchangeUsage: usage.exchangeUsage ?? UNKNOWN,
        copilotUsage: usage.copilotUsage ?? UNKNOWN,
        copilotActivityScore: typeof usage.copilotActivityScore === "number" ? usage.copilotActivityScore : UNKNOWN,
        powerBiUsage: usage.powerBiUsage ?? UNKNOWN,
        visioUsage: usage.visioUsage ?? UNKNOWN,
        projectUsage: usage.projectUsage ?? UNKNOWN,
        teamsPhoneUsage: usage.teamsPhoneUsage ?? UNKNOWN,
        audioConferencingUsage: usage.audioConferencingUsage ?? UNKNOWN,
        mailboxStorageBytes: mailbox.mailboxStorageBytes ?? UNKNOWN,
        oneDriveStorageBytes: usage.oneDriveStorageBytes ?? UNKNOWN,
        sharePointStorageBytes: usage.sharePointStorageBytes ?? UNKNOWN,
        legalHold: typeof mailbox.legalHold === "boolean" ? mailbox.legalHold : UNKNOWN,
        retentionPolicy: mailbox.retentionPolicy ?? UNKNOWN,
        complianceFlags: mailbox.complianceFlags ?? UNKNOWN,
        evidenceFreshness: deriveEvidenceFreshness(sourceTimestamp),
        sourceTimestamp,
        connectorHealth: "HEALTHY",
        identityConfidence: upn ? 0.95 : 0.2,
        licenseConfidence: assigned.length > 0 ? 0.95 : 0.5,
        usageConfidence: usage && Object.keys(usage).length > 0 ? 0.85 : 0.4,
        storageConfidence: mailbox && Object.keys(mailbox).length > 0 ? 0.8 : 0.4,
        pricingConfidence: 0.6,
        sourceSystem: "M365_GRAPH",
        evidenceCompleteness: 0.8,
      };
    });
  }
}
