import type { AIUsageRecord } from "./ai-usage-normalization";

export interface AIGovernancePolicy {
  approvedModels: string[];
  blockedModels: string[];
  maxCostPerOperation: number;
}

export interface AIGovernanceEvaluation {
  compliant: boolean;
  violations: string[];
}

export function evaluateAIGovernancePolicy(policy: AIGovernancePolicy, record: AIUsageRecord): AIGovernanceEvaluation {
  const violations: string[] = [];

  if (policy.blockedModels.includes(record.model)) violations.push("BLOCKED_MODEL");
  if (policy.approvedModels.length > 0 && !policy.approvedModels.includes(record.model)) violations.push("UNAPPROVED_MODEL");
  if (record.estimatedCost > policy.maxCostPerOperation) violations.push("COST_LIMIT_EXCEEDED");

  return { compliant: violations.length === 0, violations };
}
