export type WorkflowPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type WorkflowRoute = { workflowType: string; priority: WorkflowPriority; slaBusinessDays: number; workflowRequired: boolean };

export function routeM365Workflow(input: { lifecycleState?: string; recommendationType?: string; governanceOutcome?: string; projectedMonthlySavings?: number }): WorkflowRoute {
  if (input.lifecycleState === "NEEDS_EVIDENCE") return { workflowType: "NEEDS_EVIDENCE", priority: "MEDIUM", slaBusinessDays: 7, workflowRequired: true };
  if (input.lifecycleState === "NEEDS_TRUST_REVIEW") return { workflowType: "NEEDS_TRUST_REVIEW", priority: "MEDIUM", slaBusinessDays: 7, workflowRequired: true };
  if (input.lifecycleState === "GOVERNANCE_REVIEW_REQUIRED" || input.governanceOutcome === "REQUIRE_APPROVAL") return { workflowType: "GOVERNANCE_REVIEW_REQUIRED", priority: "CRITICAL", slaBusinessDays: 1, workflowRequired: true };
  if (/HIGH_TIER|RIGHTSIZE|DOWNGRADE/i.test(input.recommendationType ?? "")) return { workflowType: "HIGH_TIER_RIGHTSIZE", priority: "HIGH", slaBusinessDays: 3, workflowRequired: true };
  if (/COPILOT/i.test(input.recommendationType ?? "")) return { workflowType: "COPILOT_REVIEW", priority: "MEDIUM", slaBusinessDays: 7, workflowRequired: true };
  if (/STORAGE/i.test(input.recommendationType ?? "")) return { workflowType: "STORAGE_REVIEW", priority: "LOW", slaBusinessDays: 14, workflowRequired: true };
  if (/RENEWAL_READINESS/i.test(input.recommendationType ?? "")) return { workflowType: "RENEWAL_READINESS_REVIEW", priority: "LOW", slaBusinessDays: 14, workflowRequired: true };
  return { workflowType: "WORKFLOW_REVIEW", priority: "MEDIUM", slaBusinessDays: 7, workflowRequired: false };
}
