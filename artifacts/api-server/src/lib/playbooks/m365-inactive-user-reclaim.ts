import type { BasePlaybook, PlaybookEvaluationResult } from "./base-playbook";

type M365Candidate = {
  email: string;
  displayName: string;
  sku: string;
  cost: number;
  days: number;
  accountEnabled?: boolean;
  assignedLicenses?: string[];
  userPrincipalName?: string;
  mailboxType?: string;
};

const isExcluded = (c: M365Candidate): string[] => {
  const e = c.email.toLowerCase();
  const x: string[] = [];
  if (e.includes("admin")) x.push("admin account");
  if (e.includes("service")) x.push("service account");
  if (c.mailboxType === "shared") x.push("shared mailbox");
  if (e.includes("noreply") || e.includes("no-reply")) x.push("noreply user");
  return x;
};

export const m365InactiveUserReclaimPlaybook: BasePlaybook<M365Candidate> = {
  id: "m365_inactive_user_reclaim_v2",
  name: "M365 Inactive User Reclaim",
  vendor: "m365",
  action: "REMOVE_LICENSE",
  riskClass: "B",
  evaluate(input): PlaybookEvaluationResult {
    const exclusions = isExcluded(input);
    const requiredSignals = ["accountEnabled", "lastLoginDaysAgo", "assignedLicenses", "userPrincipalName"];
    const hasRequired = (input.assignedLicenses?.length ?? 0) > 0 && Boolean(input.userPrincipalName);
    const trigger = input.accountEnabled === false || input.days > 90;
    return {
      matched: trigger && hasRequired,
      reason: trigger ? "User is disabled or inactive >90 days" : "User active",
      recommendedAction: "REMOVE_LICENSE",
      estimatedMonthlySaving: input.cost,
      subject: { type: "USER", id: input.email, displayName: input.displayName, email: input.email },
      evidence: { accountEnabled: input.accountEnabled ?? true, lastLoginDaysAgo: input.days, assignedLicenses: input.assignedLicenses ?? [] },
      exclusions,
      requiredSignals,
    };
  },
};
