import { buildGovernedRecommendation } from "../../recommendations/recommendation-builder";
import type { GovernedRecommendationObject } from "../../recommendations/types";
import type { DiscoveryLifecycleState } from "../../discovery-intelligence/types";

export type M365ReclaimSignal = {
  tenantId: string;
  playbookId: "M365_DISABLED_LICENSED_USER_RECLAIM" | "M365_INACTIVE_LICENSED_USER_RECLAIM";
  userId: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  inactivityDays: number;
  assignedLicenses: string[];
  projectedMonthlySavings: number;
  graphNodeIds: string[];
  graphEdgeIds: string[];
  discoveryLifecycleState: DiscoveryLifecycleState;
  confidenceScore: number;
  reliabilityBand: "LOW" | "MEDIUM" | "HIGH";
  isAdmin?: boolean;
  isServiceAccount?: boolean;
  isSharedMailbox?: boolean;
  isNoReply?: boolean;
  hasUsageData?: boolean;
  hasTrustedIdentityMatch?: boolean;
  exclusionPolicyReason?: string;
};

export type GovernedM365ReclaimResult = { recommendation: GovernedRecommendationObject | null; excludedReasons: string[] };

export function buildM365InactiveUserReclaimGovernedRecommendation(signal: M365ReclaimSignal): GovernedM365ReclaimResult {
  const excludedReasons: string[] = [];
  if (signal.isAdmin) excludedReasons.push("admin account");
  if (signal.isServiceAccount) excludedReasons.push("service account");
  if (signal.isSharedMailbox) excludedReasons.push("shared mailbox");
  if (signal.isNoReply || signal.userPrincipalName.toLowerCase().includes("no-reply")) excludedReasons.push("no-reply account");
  if (signal.hasUsageData === false && signal.playbookId === "M365_INACTIVE_LICENSED_USER_RECLAIM") excludedReasons.push("missing usage data");
  if (signal.hasTrustedIdentityMatch === false) excludedReasons.push("untrusted identity match");
  if (signal.assignedLicenses.length === 0) excludedReasons.push("missing assigned licence");
  if (signal.exclusionPolicyReason) excludedReasons.push(signal.exclusionPolicyReason);

  const isDisabledCandidate = signal.playbookId === "M365_DISABLED_LICENSED_USER_RECLAIM" && signal.accountEnabled === false;
  const isInactiveCandidate = signal.playbookId === "M365_INACTIVE_LICENSED_USER_RECLAIM" && signal.inactivityDays > 90;
  if (!isDisabledCandidate && !isInactiveCandidate) return { recommendation: null, excludedReasons: [...excludedReasons, "not a reclaim candidate"] };
  if (excludedReasons.length > 0) return { recommendation: null, excludedReasons };

  const evidencePointers = signal.assignedLicenses.map((sku) => `m365:sku:${sku}`);
  const recommendation = buildGovernedRecommendation({
    recommendationId: `${signal.tenantId}:${signal.userId}:${signal.playbookId}`,
    tenantId: signal.tenantId,
    playbookId: signal.playbookId,
    targetEntityId: signal.userId,
    targetEntityType: "User",
    graphNodeIds: signal.graphNodeIds,
    graphEdgeIds: signal.graphEdgeIds,
    discoveryLifecycleState: signal.discoveryLifecycleState,
    confidenceScore: signal.confidenceScore,
    reliabilityBand: signal.reliabilityBand,
    projectedMonthlySavings: signal.projectedMonthlySavings,
    projectedAnnualSavings: signal.projectedMonthlySavings * 12,
    savingsConfidence: signal.confidenceScore >= 0.9 ? "HIGH" : signal.confidenceScore >= 0.7 ? "MEDIUM" : "LOW",
    actionType: "REMOVE_LICENSE",
    actionRiskClass: "B",
    evidencePointers,
    hasApproval: false,
  });

  return { recommendation, excludedReasons: [] };
}
