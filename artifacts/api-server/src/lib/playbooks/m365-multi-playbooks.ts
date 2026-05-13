import type { BasePlaybook } from "./base-playbook";

export type M365Candidate = {
  email: string;
  displayName: string;
  sku: string;
  cost: number;
  days: number;
  accountEnabled?: boolean;
  assignedLicenses?: string[];
  userPrincipalName?: string;
  mailboxType?: string;
  isSharedMailbox?: boolean;
  hasDesktopActivity?: boolean;
  advancedFeatureUsage?: number;
  activityPresent?: boolean;
  isFrontlineWorker?: boolean;
  addonUsageDaysAgo?: number | null;
};

const commonExclusions = (c: M365Candidate): string[] => {
  const e = c.email.toLowerCase();
  const x: string[] = [];
  if (e.includes("admin")) x.push("admin account");
  if (e.includes("service")) x.push("service account");
  if (e.includes("noreply") || e.includes("no-reply")) x.push("noreply user");
  return x;
};

export const disabledLicensedUserReclaimPlaybook: BasePlaybook<M365Candidate> = {
  id: "m365_disabled_licensed_user_reclaim_v1",
  name: "Disabled Licensed User Reclaim",
  vendor: "m365",
  action: "REMOVE_LICENSE",
  riskClass: "B",
  evaluate(input) {
    const matched = input.accountEnabled === false && (input.assignedLicenses?.length ?? 0) > 0;
    return { matched, reason: matched ? "Disabled account with active licenses" : "Not disabled or unlicensed", recommendedAction: "REMOVE_LICENSE", estimatedMonthlySaving: input.cost, subject: { type: "USER", id: input.email, displayName: input.displayName, email: input.email }, evidence: { accountEnabled: input.accountEnabled, assignedLicenses: input.assignedLicenses ?? [] }, exclusions: commonExclusions(input), requiredSignals: ["accountEnabled", "assignedLicenses", "userPrincipalName"] };
  },
};

export const sharedMailboxConversionPlaybook: BasePlaybook<M365Candidate> = {
  id: "m365_shared_mailbox_conversion_v1",
  name: "Shared Mailbox Conversion",
  vendor: "m365",
  action: "CONVERT_TO_SHARED_MAILBOX",
  riskClass: "B",
  evaluate(input) {
    const isShared = input.mailboxType === "shared" || input.isSharedMailbox === true || input.email.toLowerCase().includes("shared");
    const lowActivity = input.days > 90;
    const licensed = (input.assignedLicenses?.length ?? 0) > 0;
    const matched = isShared && lowActivity && licensed;
    return { matched, reason: matched ? "Shared mailbox candidate is licensed and inactive" : "Mailbox is not a shared conversion candidate", recommendedAction: ["CONVERT_TO_SHARED_MAILBOX", "REMOVE_LICENSE"], estimatedMonthlySaving: input.cost, subject: { type: "USER", id: input.email, displayName: input.displayName, email: input.email }, evidence: { mailboxType: input.mailboxType ?? "user", isSharedMailbox: isShared, lastLoginDaysAgo: input.days, assignedLicenses: input.assignedLicenses ?? [] }, exclusions: commonExclusions(input), requiredSignals: ["mailboxType", "lastLoginDaysAgo", "assignedLicenses", "userPrincipalName"] };
  },
};

export const e5ToE3RightsizingPlaybook: BasePlaybook<M365Candidate> = {
  id: "m365_e5_to_e3_rightsizing_v1",
  name: "E5 → E3 Rightsizing",
  vendor: "m365",
  action: "DOWNGRADE_LICENSE",
  riskClass: "B",
  evaluate(input) {
    const isE5 = (input.assignedLicenses ?? []).includes("E5") || input.sku === "E5";
    const lowAdvancedUsage = (input.advancedFeatureUsage ?? 0) <= 0.2;
    const matched = isE5 && lowAdvancedUsage && input.activityPresent !== false;
    return { matched, reason: matched ? "E5 assigned but advanced features underused" : "No E5 rightsizing opportunity", recommendedAction: "DOWNGRADE_LICENSE", estimatedMonthlySaving: Math.max(0, input.cost - 36), subject: { type: "USER", id: input.email, displayName: input.displayName, email: input.email }, evidence: { assignedLicenses: input.assignedLicenses ?? [], advancedFeatureUsage: input.advancedFeatureUsage ?? 0, activityPresent: input.activityPresent ?? true }, exclusions: commonExclusions(input), requiredSignals: ["assignedLicenses", "advancedFeatureUsage", "activityPresent", "userPrincipalName"] };
  },
};

export const webOnlyF3CandidatePlaybook: BasePlaybook<M365Candidate> = {
  id: "m365_web_only_f3_candidate_v1",
  name: "Web-only / F3 Candidate",
  vendor: "m365",
  action: "DOWNGRADE_LICENSE",
  riskClass: "B",
  evaluate(input) {
    const noDesktop = input.hasDesktopActivity === false;
    const lowFeatures = (input.advancedFeatureUsage ?? 0) <= 0.15;
    const worker = input.isFrontlineWorker === true || input.email.toLowerCase().includes("frontline");
    const matched = noDesktop && lowFeatures && worker;
    return { matched, reason: matched ? "User profile aligns with web-only/F3" : "User does not match web-only/F3 profile", recommendedAction: "DOWNGRADE_LICENSE", estimatedMonthlySaving: Math.max(0, input.cost - 8), subject: { type: "USER", id: input.email, displayName: input.displayName, email: input.email }, evidence: { hasDesktopActivity: input.hasDesktopActivity ?? null, advancedFeatureUsage: input.advancedFeatureUsage ?? 0, frontlineIndicator: worker }, exclusions: commonExclusions(input), requiredSignals: ["hasDesktopActivity", "advancedFeatureUsage", "isFrontlineWorker", "userPrincipalName"] };
  },
};

export const unusedAddonReclaimPlaybook: BasePlaybook<M365Candidate> = {
  id: "m365_unused_addon_reclaim_v1",
  name: "Unused Add-on Reclaim",
  vendor: "m365",
  action: "REMOVE_LICENSE",
  riskClass: "B",
  evaluate(input) {
    const isAddon = input.sku.startsWith("ADDON_");
    const noRecentUsage = (input.addonUsageDaysAgo ?? 999) > 90;
    const matched = isAddon && noRecentUsage;
    return { matched, reason: matched ? "Assigned add-on shows no recent usage" : "No add-on reclaim opportunity", recommendedAction: "REMOVE_LICENSE", estimatedMonthlySaving: input.cost, subject: { type: "USER", id: input.email, displayName: input.displayName, email: input.email }, evidence: { sku: input.sku, addonUsageDaysAgo: input.addonUsageDaysAgo ?? null }, exclusions: commonExclusions(input), requiredSignals: ["assignedLicenses", "addonUsageDaysAgo", "userPrincipalName"] };
  },
};
