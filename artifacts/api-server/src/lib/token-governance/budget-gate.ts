/**
 * Budget Gate Middleware (Sprint D, Part 2)
 *
 * Enforces token budgets at request time.
 * Checks if a request would exceed budget and blocks/warns/requires approval.
 */

import { tokenGovernancePolicyRegistry } from './token-governance-policy.js';
import { logger } from '../logger.js';

export type BudgetCheckResult = {
  allowed: boolean;
  reason?: string;
  requiresApproval: boolean;
  estimatedCostUSD: number;
  budgetRemaining: number;
  percentOfBudget: number;
};

/**
 * Estimate cost for a request based on model and tokens
 */
function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  // Simplified pricing model (in production, use actual pricing)
  const pricingMap: Record<string, { inputPrice: number; outputPrice: number }> = {
    'gpt-4': { inputPrice: 0.00003, outputPrice: 0.00006 },
    'gpt-4-turbo': { inputPrice: 0.00001, outputPrice: 0.00003 },
    'gpt-4o': { inputPrice: 0.000005, outputPrice: 0.000015 },
    'gpt-3.5-turbo': { inputPrice: 0.0000005, outputPrice: 0.0000015 },
  };

  const pricing = pricingMap[modelId] || pricingMap['gpt-3.5-turbo']; // Default to cheapest
  return inputTokens * pricing.inputPrice + outputTokens * pricing.outputPrice;
}

export class BudgetGate {
  /**
   * Check if a request is allowed under budget constraints
   */
  checkBudget(
    tenantId: string,
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    workflowId?: string,
    userId?: string,
  ): BudgetCheckResult {
    const policy = tokenGovernancePolicyRegistry.getPolicyForRequest(tenantId, workflowId, userId);

    // No policy = allow (default permissive)
    if (!policy || !policy.enabled) {
      return {
        allowed: true,
        estimatedCostUSD: estimateCost(modelId, inputTokens, outputTokens),
        budgetRemaining: Infinity,
        percentOfBudget: 0,
        requiresApproval: false,
      };
    }

    const estimatedCost = estimateCost(modelId, inputTokens, outputTokens);

    // Check request-level controls
    if (policy.maxTokensPerRequest && inputTokens + outputTokens > policy.maxTokensPerRequest) {
      return {
        allowed: policy.enforcementMode !== 'BLOCK',
        requiresApproval: policy.enforcementMode === 'REQUIRE_APPROVAL',
        reason: `Request exceeds maxTokensPerRequest: ${inputTokens + outputTokens} > ${policy.maxTokensPerRequest}`,
        estimatedCostUSD: estimatedCost,
        budgetRemaining: 0,
        percentOfBudget: 100,
      };
    }

    const totalTokens = inputTokens + outputTokens;
    const outputRatio = totalTokens > 0 ? outputTokens / totalTokens : 0;
    if (policy.maxOutputRatio && outputRatio > policy.maxOutputRatio) {
      return {
        allowed: policy.enforcementMode !== 'BLOCK',
        requiresApproval: policy.enforcementMode === 'REQUIRE_APPROVAL',
        reason: `Output ratio exceeds limit: ${(outputRatio * 100).toFixed(1)}% > ${(policy.maxOutputRatio * 100).toFixed(1)}%`,
        estimatedCostUSD: estimatedCost,
        budgetRemaining: 0,
        percentOfBudget: 100,
      };
    }

    // Check cost threshold
    if (policy.requireApprovalAboveCost && estimatedCost > policy.requireApprovalAboveCost) {
      return {
        allowed: true, // Allow but require approval
        requiresApproval: true,
        reason: `Estimated cost $${estimatedCost.toFixed(4)} exceeds approval threshold $${policy.requireApprovalAboveCost}`,
        estimatedCostUSD: estimatedCost,
        budgetRemaining: policy.requireApprovalAboveCost - estimatedCost,
        percentOfBudget: (estimatedCost / policy.requireApprovalAboveCost) * 100,
      };
    }

    // Check budgets
    for (const budget of policy.budgets) {
      if (budget.status === 'EXCEEDED') {
        return {
          allowed: policy.enforcementMode !== 'BLOCK',
          requiresApproval: policy.enforcementMode === 'REQUIRE_APPROVAL',
          reason: `Budget ${budget.budgetId} (${budget.budgetType}) already exceeded`,
          estimatedCostUSD: estimatedCost,
          budgetRemaining: 0,
          percentOfBudget: 100,
        };
      }

      const projectedSpend = budget.currentSpendUSD + estimatedCost;
      const percentOfBudget = (projectedSpend / budget.budgetAmountUSD) * 100;
      const remaining = budget.budgetAmountUSD - budget.currentSpendUSD;

      // Check if this request would exceed budget
      if (projectedSpend > budget.budgetAmountUSD) {
        return {
          allowed: policy.enforcementMode !== 'BLOCK',
          requiresApproval: policy.enforcementMode === 'REQUIRE_APPROVAL',
          reason: `Request would exceed ${budget.budgetType} budget: $${projectedSpend.toFixed(2)} > $${budget.budgetAmountUSD}`,
          estimatedCostUSD: estimatedCost,
          budgetRemaining: remaining,
          percentOfBudget,
        };
      }

      // Check if reaching alert threshold
      if (percentOfBudget > budget.alertThresholdPercent) {
        logger.warn(
          {
            tenantId,
            budgetId: budget.budgetId,
            percentOfBudget: percentOfBudget.toFixed(1),
            threshold: budget.alertThresholdPercent,
            component: 'budget-gate',
          },
          `Budget ${budget.budgetType} approaching limit`,
        );
      }
    }

    return {
      allowed: true,
      estimatedCostUSD: estimatedCost,
      budgetRemaining: policy.budgets[0]?.budgetAmountUSD - policy.budgets[0]?.currentSpendUSD || Infinity,
      percentOfBudget: policy.budgets[0] ? (policy.budgets[0].currentSpendUSD / policy.budgets[0].budgetAmountUSD) * 100 : 0,
      requiresApproval: false,
    };
  }

  /**
   * Update budget after request execution
   */
  recordSpend(tenantId: string, budgetId: string, costUSD: number, tokens: number): void {
    const policy = Array.from(tokenGovernancePolicyRegistry['policies']?.values?.() || []).find(
      (p) => p.tenantId === tenantId && p.budgets.some((b) => b.budgetId === budgetId),
    );

    if (!policy) return;

    for (const budget of policy.budgets) {
      if (budget.budgetId !== budgetId) continue;

      budget.currentSpendUSD += costUSD;
      budget.currentTokens += tokens;

      // Update status
      if (budget.currentSpendUSD > budget.budgetAmountUSD) {
        budget.status = 'EXCEEDED';
      }
    }
  }
}

export const budgetGate = new BudgetGate();
