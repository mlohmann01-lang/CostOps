/**
 * Token Governance Policy Registry (Sprint D, Part 1)
 *
 * Defines policies, budgets, and constraints for token governance.
 * Policies are tenant-specific and define acceptable token spending patterns.
 */

export type TokenGovernanceRiskClass = 'A' | 'B' | 'C';

export type TokenBudgetType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PER_REQUEST';

export type TokenGovernancePolicy = {
  policyId: string;
  tenantId: string;
  name: string;
  riskClass: TokenGovernanceRiskClass;
  enabled: boolean;

  // Budget controls
  budgets: TokenBudget[];

  // Model enforcement
  allowedModels?: string[]; // If set, only these models allowed
  deniedModels?: string[]; // If set, these models blocked
  modelDowngradeRules?: ModelDowngradeRule[];

  // Request-level controls
  maxTokensPerRequest?: number; // Block if single request exceeds
  maxOutputRatio?: number; // Block if output > this fraction of total
  requireApprovalAboveCost?: number; // Require approval for requests > this cost (USD)

  // Enforcement mode
  enforcementMode: 'WARN' | 'BLOCK' | 'REQUIRE_APPROVAL';

  createdAt: string;
  updatedAt: string;
};

export type TokenBudget = {
  budgetId: string;
  scope: 'TENANT' | 'WORKFLOW' | 'USER'; // Tenant-wide, per-workflow, or per-user
  scopeId?: string; // Workflow ID or User ID (empty for TENANT scope)
  budgetType: TokenBudgetType;
  budgetAmountUSD: number;
  alertThresholdPercent: number; // Alert when usage > this % of budget (e.g., 80)
  windowStartAt?: string; // For daily/weekly/monthly budgets
  windowEndAt?: string;
  currentSpendUSD: number;
  currentTokens: number;
  status: 'ACTIVE' | 'EXCEEDED' | 'PAUSED';
};

export type ModelDowngradeRule = {
  ruleId: string;
  triggerModel: string; // e.g., "gpt-4"
  targetModel: string; // e.g., "gpt-3.5-turbo"
  triggerCondition: 'AVG_INPUT_TOKENS_BELOW' | 'COST_PER_REQUEST_ABOVE' | 'OUTPUT_RATIO_ABOVE';
  triggerThreshold: number;
  requiresApproval: boolean;
  enabled: boolean;
};

export type PolicyReadinessStatus = {
  policyId: string;
  status: 'READY' | 'INVALID' | 'INCOMPLETE';
  errors: string[];
  warnings: string[];
  checkedAt: string;
};

/**
 * Policy registry and validation
 */
export class TokenGovernancePolicyRegistry {
  private policies: Map<string, TokenGovernancePolicy> = new Map();

  /**
   * Register or update a policy
   */
  registerPolicy(policy: TokenGovernancePolicy): void {
    this.policies.set(policy.policyId, policy);
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): TokenGovernancePolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * List all policies for a tenant
   */
  listTenantPolicies(tenantId: string): TokenGovernancePolicy[] {
    return Array.from(this.policies.values()).filter((p) => p.tenantId === tenantId && p.enabled);
  }

  /**
   * Check policy readiness (validation)
   */
  checkPolicyReadiness(policy: TokenGovernancePolicy): PolicyReadinessStatus {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate budgets
    if (policy.budgets.length === 0) {
      errors.push('At least one budget must be defined');
    }

    for (const budget of policy.budgets) {
      if (budget.budgetAmountUSD <= 0) {
        errors.push(`Budget ${budget.budgetId} has invalid amount: ${budget.budgetAmountUSD}`);
      }
      if (budget.alertThresholdPercent < 0 || budget.alertThresholdPercent > 100) {
        errors.push(`Budget ${budget.budgetId} alert threshold must be 0-100`);
      }
    }

    // Validate model rules
    if (policy.modelDowngradeRules) {
      for (const rule of policy.modelDowngradeRules) {
        if (!rule.enabled) continue;
        if (rule.triggerModel === rule.targetModel) {
          errors.push(`Rule ${rule.ruleId}: trigger and target models must differ`);
        }
        if (rule.triggerThreshold <= 0) {
          errors.push(`Rule ${rule.ruleId}: threshold must be > 0`);
        }
      }
    }

    // Validate request controls
    if (policy.maxTokensPerRequest && policy.maxTokensPerRequest <= 0) {
      errors.push('maxTokensPerRequest must be > 0');
    }
    if (policy.maxOutputRatio && (policy.maxOutputRatio <= 0 || policy.maxOutputRatio > 1)) {
      errors.push('maxOutputRatio must be between 0 and 1');
    }
    if (policy.requireApprovalAboveCost && policy.requireApprovalAboveCost <= 0) {
      errors.push('requireApprovalAboveCost must be > 0');
    }

    // Warnings for class A policies
    if (policy.riskClass === 'A') {
      if (policy.enforcementMode !== 'BLOCK') {
        warnings.push('Class A policy should use BLOCK enforcement mode');
      }
      if (!policy.modelDowngradeRules || policy.modelDowngradeRules.length === 0) {
        warnings.push('Class A policy has no model downgrade rules defined');
      }
    }

    return {
      policyId: policy.policyId,
      status: errors.length > 0 ? 'INVALID' : 'READY',
      errors,
      warnings,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Get applicable policy for a request (highest-priority matching policy)
   */
  getPolicyForRequest(tenantId: string, workflowId?: string, userId?: string): TokenGovernancePolicy | undefined {
    const allPolicies = this.listTenantPolicies(tenantId);

    // Priority: workflow > user > tenant
    if (workflowId) {
      const workflowPolicy = allPolicies.find((p) => {
        const budgets = p.budgets.filter((b) => b.scope === 'WORKFLOW' && b.scopeId === workflowId);
        return budgets.length > 0;
      });
      if (workflowPolicy) return workflowPolicy;
    }

    if (userId) {
      const userPolicy = allPolicies.find((p) => {
        const budgets = p.budgets.filter((b) => b.scope === 'USER' && b.scopeId === userId);
        return budgets.length > 0;
      });
      if (userPolicy) return userPolicy;
    }

    // Fall back to tenant policy
    return allPolicies.find((p) => p.budgets.some((b) => b.scope === 'TENANT'));
  }

  /**
   * Create default policy for a tenant (no-op, just defines structure)
   */
  createDefaultPolicy(tenantId: string): TokenGovernancePolicy {
    return {
      policyId: `policy-default-${tenantId}-${Date.now()}`,
      tenantId,
      name: `Default Token Governance Policy`,
      riskClass: 'C', // Default to permissive
      enabled: false, // Disabled by default
      budgets: [
        {
          budgetId: `budget-monthly-${tenantId}`,
          scope: 'TENANT',
          budgetType: 'MONTHLY',
          budgetAmountUSD: 1000, // $1000/month default
          alertThresholdPercent: 80,
          currentSpendUSD: 0,
          currentTokens: 0,
          status: 'ACTIVE',
        },
      ],
      enforcementMode: 'WARN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const tokenGovernancePolicyRegistry = new TokenGovernancePolicyRegistry();
