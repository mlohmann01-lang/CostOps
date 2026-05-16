export type GovernanceOutcome = "ALLOW" | "WARN" | "BLOCK" | "REQUIRE_APPROVAL" | "EXCLUDE";
export type GovernanceInput = {
  recommendationType?: string;
  privileged?: boolean;
  executive?: boolean;
  legalHoldPresent?: boolean;
  legalHoldUnknown?: boolean;
  retentionUnknown?: boolean;
  copilotUsageUnavailable?: boolean;
  highTierDowngrade?: boolean;
  serviceAccountAmbiguous?: boolean;
  sharedMailboxAmbiguous?: boolean;
  renewalAggregate?: boolean;
};

export function evaluateM365Governance(input: GovernanceInput): GovernanceOutcome {
  if (input.legalHoldPresent && /STORAGE/i.test(input.recommendationType ?? "")) return "BLOCK";
  if (input.privileged && /RECLAIM|REMOVE|DOWNGRADE|RIGHTSIZE/i.test(input.recommendationType ?? "")) return "REQUIRE_APPROVAL";
  if (input.executive) return "REQUIRE_APPROVAL";
  if (input.highTierDowngrade) return "REQUIRE_APPROVAL";
  if (input.legalHoldUnknown || input.retentionUnknown || input.copilotUsageUnavailable || input.serviceAccountAmbiguous || input.sharedMailboxAmbiguous) return "WARN";
  if (input.renewalAggregate) return "WARN";
  return "ALLOW";
}
