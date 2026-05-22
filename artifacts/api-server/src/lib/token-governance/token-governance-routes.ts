/**
 * Token Governance Routes (Sprint D, Part 5)
 *
 * 6 endpoints:
 * - GET /policies: List tenant policies
 * - POST /policies: Create/update policy
 * - GET /budgets: View budget state
 * - POST /downgrades: Execute model downgrade
 * - POST /downgrades/:id/approve: Approve downgrade
 * - GET /verifications: View savings verifications
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { tokenGovernancePolicyRegistry, type TokenGovernancePolicy } from './token-governance-policy.js';
import { budgetGate } from './budget-gate.js';
import { modelDowngradeExecutor } from './model-downgrade-execution.js';
import { savingsVerificationService } from './savings-verification.js';
import { logger } from '../logger.js';

const router = Router();

// Middleware: verify tenant context
const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  const authContext = (req as { __authContext?: { tenantId?: string } }).__authContext;
  if (!authContext?.tenantId) {
    res.status(401).json({ error: 'TENANT_CONTEXT_REQUIRED' });
    return;
  }
  next();
};

/**
 * GET /policies
 * List all enabled policies for the tenant
 */
router.get('/policies', requireTenant, (req: Request, res: Response) => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;
    const policies = tokenGovernancePolicyRegistry.listTenantPolicies(tenantId);

    res.json({
      tenantId,
      policies: policies.map((p) => ({
        policyId: p.policyId,
        name: p.name,
        riskClass: p.riskClass,
        enabled: p.enabled,
        enforcementMode: p.enforcementMode,
        budgets: p.budgets.length,
        modelRules: p.modelDowngradeRules?.length || 0,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ error, component: 'token-governance-routes' }, 'Error listing policies');
    res.status(500).json({ error: 'POLICY_LIST_FAILED' });
  }
});

/**
 * POST /policies
 * Create or update a policy
 */
const PolicySchema = z.object({
  name: z.string(),
  riskClass: z.enum(['A', 'B', 'C']),
  enforcementMode: z.enum(['WARN', 'BLOCK', 'REQUIRE_APPROVAL']),
  budgets: z
    .array(
      z.object({
        scope: z.enum(['TENANT', 'WORKFLOW', 'USER']),
        scopeId: z.string().optional(),
        budgetType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'PER_REQUEST']),
        budgetAmountUSD: z.number().positive(),
        alertThresholdPercent: z.number().min(0).max(100),
      }),
    )
    .min(1),
});

router.post('/policies', requireTenant, (req: Request, res: Response): void => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;

    const validation = PolicySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'INVALID_REQUEST_BODY',
        details: validation.error.errors,
      });
      return;
    }

    const { name, riskClass, enforcementMode, budgets } = validation.data;
    const policy: TokenGovernancePolicy = {
      policyId: `policy-${tenantId}-${Date.now()}`,
      tenantId,
      name,
      riskClass,
      enabled: true,
      enforcementMode,
      budgets: budgets.map((b) => ({
        budgetId: `budget-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        scope: b.scope,
        scopeId: Array.isArray(b.scopeId) ? b.scopeId[0] : b.scopeId,
        budgetType: b.budgetType,
        budgetAmountUSD: b.budgetAmountUSD,
        alertThresholdPercent: b.alertThresholdPercent,
        currentSpendUSD: 0,
        currentTokens: 0,
        status: 'ACTIVE',
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const readiness = tokenGovernancePolicyRegistry.checkPolicyReadiness(policy);
    if (readiness.status !== 'READY') {
      res.status(400).json({
        error: 'POLICY_INVALID',
        errors: readiness.errors,
        warnings: readiness.warnings,
      });
      return;
    }

    tokenGovernancePolicyRegistry.registerPolicy(policy);
    res.status(201).json({
      policyId: policy.policyId,
      status: 'CREATED',
      readiness,
    });
  } catch (error) {
    logger.error({ error, component: 'token-governance-routes' }, 'Error creating policy');
    res.status(500).json({ error: 'POLICY_CREATE_FAILED' });
  }
});

/**
 * GET /budgets
 * View current budget state for tenant
 */
router.get('/budgets', requireTenant, (req: Request, res: Response) => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;
    const policies = tokenGovernancePolicyRegistry.listTenantPolicies(tenantId);

    const budgets = policies.flatMap((p) =>
      p.budgets.map((b) => ({
        budgetId: b.budgetId,
        scope: b.scope,
        scopeId: b.scopeId,
        budgetType: b.budgetType,
        budgetAmountUSD: b.budgetAmountUSD,
        currentSpendUSD: b.currentSpendUSD,
        currentTokens: b.currentTokens,
        percentUsed: (b.currentSpendUSD / b.budgetAmountUSD) * 100,
        status: b.status,
        alertThreshold: b.alertThresholdPercent,
      })),
    );

    res.json({
      tenantId,
      budgets,
      totalBudgetUSD: budgets.reduce((sum, b) => sum + b.budgetAmountUSD, 0),
      totalSpendUSD: budgets.reduce((sum, b) => sum + b.currentSpendUSD, 0),
    });
  } catch (error) {
    logger.error({ error, component: 'token-governance-routes' }, 'Error listing budgets');
    res.status(500).json({ error: 'BUDGET_LIST_FAILED' });
  }
});

/**
 * POST /downgrades
 * Propose a model downgrade execution
 */
const DowngradeSchema = z.object({
  fromModel: z.string(),
  toModel: z.string(),
  reason: z.string(),
  estimatedMonthlySavingsUSD: z.number().positive(),
  affectedWorkflows: z.array(z.string()),
});

router.post('/downgrades', requireTenant, (req: Request, res: Response): void => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string; actorId: string } }).__authContext!;
    const tenantId = authContext.tenantId;

    const validation = DowngradeSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'INVALID_REQUEST_BODY',
        details: validation.error.errors,
      });
      return;
    }

    const { fromModel, toModel, reason, estimatedMonthlySavingsUSD, affectedWorkflows } = validation.data;

    // Create proposal
    const proposal = modelDowngradeExecutor.createProposal(
      tenantId,
      fromModel,
      toModel,
      reason,
      estimatedMonthlySavingsUSD,
      affectedWorkflows,
    );

    // Create execution (pending approval)
    const execution = modelDowngradeExecutor.createExecution(proposal);

    res.status(202).json({
      executionId: execution.executionId,
      proposalId: proposal.proposalId,
      status: execution.status,
      requiresDualApproval: proposal.requiresDualApproval,
      estimatedSavings: estimatedMonthlySavingsUSD,
    });
  } catch (error) {
    logger.error({ error, component: 'token-governance-routes' }, 'Error creating downgrade');
    res.status(500).json({ error: 'DOWNGRADE_CREATE_FAILED' });
  }
});

/**
 * POST /downgrades/:executionId/approve
 * Approve a downgrade (supports DUAL_APPROVAL)
 */
router.post('/downgrades/:executionId/approve', requireTenant, (req: Request, res: Response): void => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string; actorId: string } }).__authContext!;
    const executionId = String(req.params.executionId);

    const result = modelDowngradeExecutor.recordApproval(executionId, authContext.actorId);

    if (result.blocked) {
      res.status(403).json({
        error: 'DUAL_APPROVAL_SAME_ACTOR_BLOCKED',
        message: 'Same actor cannot approve both first and second approval',
      });
      return;
    }

    const execution = modelDowngradeExecutor.getExecution(executionId);
    if (!execution || execution.status === 'EXECUTED') {
      res.status(404).json({ error: 'EXECUTION_NOT_FOUND_OR_ALREADY_EXECUTED' });
      return;
    }

    // If approved, execute immediately
    if (execution.status === 'APPROVED') {
      const execResult = modelDowngradeExecutor.executeDowngrade(executionId);
      if (!execResult.success) {
        res.status(500).json({ error: 'EXECUTION_FAILED', details: execResult.error });
        return;
      }
    }

    res.json({
      executionId,
      status: execution.status,
      approvalChain: execution.approvalChain.length,
      nextStep: result.nextStep,
    });
  } catch (error) {
    logger.error({ error, component: 'token-governance-routes' }, 'Error approving downgrade');
    res.status(500).json({ error: 'APPROVAL_FAILED' });
  }
});

/**
 * GET /verifications
 * List savings verifications for tenant
 */
router.get('/verifications', requireTenant, (req: Request, res: Response) => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;

    const verifications = savingsVerificationService.listVerifications(tenantId);
    const totals = savingsVerificationService.getTotalRealizedSavings(tenantId);

    res.json({
      tenantId,
      verifications: verifications.map((v) => ({
        verificationId: v.verificationId,
        executionId: v.executionId,
        fromModel: v.fromModel,
        toModel: v.toModel,
        baselineCostUSD: v.baselineCostUSD,
        measuredCostUSD: v.measuredCostUSD,
        realizedSavingsUSD: v.realizedSavingsUSD,
        realizedSavingsPercent: v.realizedSavingsPercent,
        status: v.status,
        confidenceLevel: v.confidenceLevel,
        startedAt: v.startedAt,
        completedAt: v.completedAt,
      })),
      totalRealizedSavingsUSD: totals.totalSavingsUSD,
      completedVerifications: totals.completedCount,
      averageConfidence: totals.averageConfidence,
    });
  } catch (error) {
    logger.error({ error, component: 'token-governance-routes' }, 'Error listing verifications');
    res.status(500).json({ error: 'VERIFICATION_LIST_FAILED' });
  }
});

export default router;
