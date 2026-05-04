export type ActionRiskClass = "A" | "B" | "C";
export type UserImpact = "NONE" | "LOW" | "MEDIUM" | "HIGH";
export type Reversibility =
  | "FULLY_REVERSIBLE"
  | "REVERSIBLE_WITH_DISRUPTION"
  | "MANUAL_ROLLBACK"
  | "IRREVERSIBLE";

export type ActionRiskProfile = {
  action: string;
  riskClass: ActionRiskClass;
  userImpact: UserImpact;
  reversibility: Reversibility;
  requiresApproval: boolean;
  autoExecuteAllowed: boolean;
  rollbackRequired: boolean;
};

export const ACTION_RISK_REGISTRY: Record<string, ActionRiskProfile> = {
  REMOVE_LICENSE: {
    action: "REMOVE_LICENSE",
    riskClass: "B",
    userImpact: "MEDIUM",
    reversibility: "REVERSIBLE_WITH_DISRUPTION",
    requiresApproval: true,
    autoExecuteAllowed: false,
    rollbackRequired: true,
  },
};

const DEFAULT_CLASS_C_PROFILE: ActionRiskProfile = {
  action: "UNKNOWN",
  riskClass: "C",
  userImpact: "HIGH",
  reversibility: "IRREVERSIBLE",
  requiresApproval: true,
  autoExecuteAllowed: false,
  rollbackRequired: true,
};

export function getActionRiskProfile(action: string): ActionRiskProfile {
  return ACTION_RISK_REGISTRY[action] ?? { ...DEFAULT_CLASS_C_PROFILE, action };
}
