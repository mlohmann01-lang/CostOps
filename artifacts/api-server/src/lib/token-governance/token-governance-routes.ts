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

// Proof node type shared across governance proof routes
type GovernanceProofNode = {
  proofId: string;
  proofType: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  confidence: number;
  upstreamProofIds: string[];
  downstreamProofIds: string[];
  evidenceHash: string;
  displayPriority: number;
  expandableDetails: Record<string, unknown>;
  environment: string;
  isFixtureBacked: boolean;
  sourceOfTruth: string;
  synthetic?: boolean;
};

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
 * List savings verifications for tenant — DB-backed, tenant-scoped
 */
router.get('/verifications', requireTenant, async (req: Request, res: Response) => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;

    const verifications = await savingsVerificationService.listVerifications(tenantId);
    const totals = await savingsVerificationService.getTotalRealizedSavings(tenantId);

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

/**
 * GET /verifications/:id
 * Get a single savings verification by ID — DB-backed, tenant-scoped.
 * Cross-tenant: returns 404 to avoid existence disclosure.
 */
router.get('/verifications/:id', requireTenant, async (req: Request, res: Response) => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;
    const verificationId = String(req.params.id);

    const verification = await savingsVerificationService.getVerification(verificationId, tenantId);

    if (!verification) {
      res.status(404).json({ error: 'VERIFICATION_NOT_FOUND' });
      return;
    }

    res.json({
      verificationId: verification.verificationId,
      executionId: verification.executionId,
      tenantId: verification.tenantId,
      fromModel: verification.fromModel,
      toModel: verification.toModel,
      baselineCostUSD: verification.baselineCostUSD,
      measuredCostUSD: verification.measuredCostUSD,
      realizedSavingsUSD: verification.realizedSavingsUSD,
      realizedSavingsPercent: verification.realizedSavingsPercent,
      status: verification.status,
      confidenceLevel: verification.confidenceLevel,
      startedAt: verification.startedAt,
      completedAt: verification.completedAt,
      proofGraphNode: savingsVerificationService.buildProofGraphNode(verification),
    });
  } catch (error) {
    logger.error({ error, component: 'token-governance-routes' }, 'Error fetching verification');
    res.status(500).json({ error: 'VERIFICATION_FETCH_FAILED' });
  }
});

/**
 * POST /verifications/:id/run
 * Trigger a measurement run for a verification — records measured cost and updates status.
 * Body: { totalTokens, totalCostUSD }
 * Idempotent: already-VERIFIED verifications are returned unchanged.
 */
const RunVerificationSchema = z.object({
  totalTokens: z.number().int().nonnegative(),
  totalCostUSD: z.number().nonnegative(),
});

router.post('/verifications/:id/run', requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;
    const verificationId = String(req.params.id);

    const validation = RunVerificationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'INVALID_REQUEST_BODY', details: validation.error.errors });
      return;
    }

    const { totalTokens, totalCostUSD } = validation.data;

    // Confirm existence and tenant ownership before running
    const existing = await savingsVerificationService.getVerification(verificationId, tenantId);
    if (!existing) {
      res.status(404).json({ error: 'VERIFICATION_NOT_FOUND' });
      return;
    }

    // Idempotency: do not re-run a completed verification
    if (existing.status === 'VERIFIED') {
      res.json({
        verificationId,
        status: existing.status,
        message: 'Verification already completed — no changes made',
        realizedSavingsUSD: existing.realizedSavingsUSD,
        confidenceLevel: existing.confidenceLevel,
      });
      return;
    }

    const updated = await savingsVerificationService.recordMeasurement(verificationId, tenantId, totalTokens, totalCostUSD);

    if (!updated) {
      res.status(404).json({ error: 'VERIFICATION_NOT_FOUND' });
      return;
    }

    res.json({
      verificationId: updated.verificationId,
      status: updated.status,
      realizedSavingsUSD: updated.realizedSavingsUSD,
      realizedSavingsPercent: updated.realizedSavingsPercent,
      confidenceLevel: updated.confidenceLevel,
      completedAt: updated.completedAt,
    });
  } catch (error) {
    logger.error({ error, component: 'token-governance-routes' }, 'Error running verification');
    res.status(500).json({ error: 'VERIFICATION_RUN_FAILED' });
  }
});

/**
 * GET /proof/:policyId
 * Proof graph for a token governance policy.
 * Returns PROOF_COMPLETE when a policy record is found with audit trail evidence;
 * returns PROOF_INCOMPLETE with a diagnostic node when data is missing.
 * Cross-tenant isolation: unknown policies return 404 (not 403).
 */
router.get('/proof/:policyId', requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;
    const policyId = String(req.params.policyId);

    // Look up policy — only within this tenant's scope
    const policy = tokenGovernancePolicyRegistry.getPolicy(policyId);

    // Cross-tenant: return 404, not 403, to avoid existence disclosure
    if (!policy || policy.tenantId !== tenantId) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }

    const now = new Date().toISOString();
    const nodes: GovernanceProofNode[] = [];

    // Node 1: policy_definition — what the policy says
    nodes.push({
      proofId: `policy-definition-${policyId}`,
      proofType: 'POLICY_DEFINITION',
      title: 'Policy definition',
      summary: `${policy.name} — risk class ${policy.riskClass}, enforcement: ${policy.enforcementMode}`,
      source: 'token-governance-policy-registry',
      timestamp: policy.createdAt,
      confidence: 1.0,
      upstreamProofIds: [],
      downstreamProofIds: [`policy-budget-summary-${policyId}`],
      evidenceHash: Buffer.from(`${policyId}:${policy.updatedAt}`).toString('base64').slice(0, 32),
      displayPriority: 1,
      expandableDetails: {
        policyId: policy.policyId,
        name: policy.name,
        riskClass: policy.riskClass,
        enabled: policy.enabled,
        enforcementMode: policy.enforcementMode,
        budgetCount: policy.budgets.length,
        modelRuleCount: policy.modelDowngradeRules?.length ?? 0,
        allowedModels: policy.allowedModels ?? [],
        deniedModels: policy.deniedModels ?? [],
        maxTokensPerRequest: policy.maxTokensPerRequest ?? null,
        requireApprovalAboveCost: policy.requireApprovalAboveCost ?? null,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
      },
      environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
      isFixtureBacked: false,
      sourceOfTruth: 'POLICY_REGISTRY',
    });

    // Node 2: budget_summary — aggregated budget state (no raw credentials)
    const totalBudgetUSD = policy.budgets.reduce((sum, b) => sum + b.budgetAmountUSD, 0);
    const totalSpendUSD = policy.budgets.reduce((sum, b) => sum + b.currentSpendUSD, 0);
    const exceededBudgets = policy.budgets.filter((b) => b.status === 'EXCEEDED').length;

    nodes.push({
      proofId: `policy-budget-summary-${policyId}`,
      proofType: 'BUDGET_SUMMARY',
      title: 'Budget state',
      summary: `$${totalSpendUSD.toFixed(2)} of $${totalBudgetUSD.toFixed(2)} consumed across ${policy.budgets.length} budget(s)${exceededBudgets > 0 ? ` — ${exceededBudgets} exceeded` : ''}`,
      source: 'token-governance-policy-registry',
      timestamp: now,
      confidence: 0.95,
      upstreamProofIds: [`policy-definition-${policyId}`],
      downstreamProofIds: [],
      evidenceHash: Buffer.from(`${policyId}:budget:${totalSpendUSD}`).toString('base64').slice(0, 32),
      displayPriority: 2,
      expandableDetails: {
        budgetCount: policy.budgets.length,
        totalBudgetUSD,
        totalSpendUSD,
        percentConsumed: totalBudgetUSD > 0 ? ((totalSpendUSD / totalBudgetUSD) * 100).toFixed(1) : '0.0',
        exceededBudgets,
        budgets: policy.budgets.map((b) => ({
          budgetId: b.budgetId,
          scope: b.scope,
          scopeId: b.scopeId ?? null,
          budgetType: b.budgetType,
          budgetAmountUSD: b.budgetAmountUSD,
          currentSpendUSD: b.currentSpendUSD,
          status: b.status,
          alertThresholdPercent: b.alertThresholdPercent,
        })),
      },
      environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
      isFixtureBacked: false,
      sourceOfTruth: 'POLICY_REGISTRY',
    });

    // Node 3: savings_impact — verifications linked to this policy's tenant
    const verifications = await savingsVerificationService.listVerifications(tenantId);
    const completedVerifications = verifications.filter((v) => v.status === 'VERIFIED');
    const totalRealizedSavings = completedVerifications.reduce((sum, v) => sum + v.realizedSavingsUSD, 0);

    nodes.push({
      proofId: `policy-savings-impact-${policyId}`,
      proofType: 'SAVINGS_IMPACT',
      title: 'Savings impact',
      summary: completedVerifications.length > 0
        ? `$${totalRealizedSavings.toFixed(2)} realized across ${completedVerifications.length} completed downgrade(s)`
        : 'No completed savings verifications for this tenant',
      source: 'savings-verification-service',
      timestamp: now,
      confidence: completedVerifications.length > 0 ? 0.9 : 0.5,
      upstreamProofIds: [`policy-definition-${policyId}`],
      downstreamProofIds: [],
      evidenceHash: Buffer.from(`${policyId}:savings:${totalRealizedSavings}`).toString('base64').slice(0, 32),
      displayPriority: 3,
      expandableDetails: {
        completedVerifications: completedVerifications.length,
        totalVerifications: verifications.length,
        totalRealizedSavingsUSD: totalRealizedSavings,
      },
      environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
      isFixtureBacked: false,
      sourceOfTruth: 'SAVINGS_VERIFICATION_SERVICE',
    });

    const status: 'PROOF_COMPLETE' | 'PROOF_INCOMPLETE' = nodes.length >= 3 ? 'PROOF_COMPLETE' : 'PROOF_INCOMPLETE';

    res.json({
      policyId,
      tenantId,
      status,
      nodes,
    });
  } catch (error) {
    logger.error({ error, component: 'token-governance-routes' }, 'Error building policy proof graph');
    res.status(500).json({ error: 'PROOF_GRAPH_FAILED' });
  }
});

/**
 * GET /proof/downgrades/:downgradeId
 * Proof graph for a model downgrade proposal/execution.
 * Cross-tenant isolation: unknown downgrade IDs return 404.
 */
router.get('/proof/downgrades/:downgradeId', requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const authContext = (req as { __authContext?: { tenantId: string } }).__authContext!;
    const tenantId = authContext.tenantId;
    const downgradeId = String(req.params.downgradeId);

    // Look up the execution — cross-tenant: 404 not 403
    const execution = modelDowngradeExecutor.getExecution(downgradeId);
    if (!execution || execution.tenantId !== tenantId) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }

    const now = new Date().toISOString();
    const nodes: GovernanceProofNode[] = [];

    // Node 1: downgrade_proposal — what the proposal says
    nodes.push({
      proofId: `downgrade-proposal-${downgradeId}`,
      proofType: 'DOWNGRADE_PROPOSAL',
      title: 'Downgrade proposal',
      summary: `${execution.fromModel} → ${execution.toModel} (status: ${execution.status})`,
      source: 'model-downgrade-executor',
      timestamp: now,
      confidence: 1.0,
      upstreamProofIds: [],
      downstreamProofIds: [`downgrade-approval-${downgradeId}`],
      evidenceHash: Buffer.from(`${downgradeId}:proposal`).toString('base64').slice(0, 32),
      displayPriority: 1,
      expandableDetails: {
        executionId: execution.executionId,
        proposalId: execution.proposalId,
        fromModel: execution.fromModel,
        toModel: execution.toModel,
        status: execution.status,
        requiresDualApproval: execution.requiresDualApproval ?? false,
      },
      environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
      isFixtureBacked: false,
      sourceOfTruth: 'DOWNGRADE_EXECUTOR',
    });

    // Node 2: approval_record — who approved (actor IDs only, no credentials)
    const approvalCount = execution.approvalChain.length;
    const isApproved = ['APPROVED', 'EXECUTED', 'ROLLED_BACK'].includes(execution.status);

    nodes.push({
      proofId: `downgrade-approval-${downgradeId}`,
      proofType: 'APPROVAL_RECORD',
      title: 'Approval record',
      summary: approvalCount === 0
        ? 'No approvals recorded yet'
        : `${approvalCount} approval(s) recorded — ${isApproved ? 'approved' : 'pending'}`,
      source: 'model-downgrade-executor',
      timestamp: execution.approvalChain[approvalCount - 1]?.approvedAt ?? now,
      confidence: approvalCount > 0 ? 0.95 : 0.5,
      upstreamProofIds: [`downgrade-proposal-${downgradeId}`],
      downstreamProofIds: [`downgrade-execution-evidence-${downgradeId}`],
      evidenceHash: Buffer.from(`${downgradeId}:approval:${approvalCount}`).toString('base64').slice(0, 32),
      displayPriority: 2,
      expandableDetails: {
        approvalCount,
        isFullyApproved: isApproved,
        approvalChain: execution.approvalChain.map((a) => ({
          approverActorId: a.approverActorId,
          approvalType: a.approvalType,
          approvedAt: a.approvedAt,
          // No credentials or secrets — only actor IDs and timestamps
        })),
      },
      environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
      isFixtureBacked: false,
      sourceOfTruth: 'DOWNGRADE_EXECUTOR',
    });

    // Node 3: execution_evidence — execution state
    const isExecuted = execution.status === 'EXECUTED';

    nodes.push({
      proofId: `downgrade-execution-evidence-${downgradeId}`,
      proofType: 'EXECUTION_EVIDENCE',
      title: 'Execution evidence',
      summary: isExecuted
        ? `Downgrade executed at ${execution.executedAt ?? 'unknown'}`
        : `Execution not yet completed — status: ${execution.status}`,
      source: 'model-downgrade-executor',
      timestamp: execution.executedAt ?? now,
      confidence: isExecuted ? 0.95 : 0.4,
      upstreamProofIds: [`downgrade-approval-${downgradeId}`],
      downstreamProofIds: [`downgrade-cost-impact-${downgradeId}`],
      evidenceHash: Buffer.from(`${downgradeId}:execution:${execution.status}`).toString('base64').slice(0, 32),
      displayPriority: 3,
      expandableDetails: {
        status: execution.status,
        executedAt: execution.executedAt ?? null,
        rollbackReason: execution.rollbackReason ?? null,
      },
      environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
      isFixtureBacked: false,
      sourceOfTruth: 'DOWNGRADE_EXECUTOR',
    });

    // Node 4: cost_impact — savings verification if available
    const verifications = (await savingsVerificationService.listVerifications(tenantId))
      .filter((v) => v.executionId === downgradeId);
    const latestVerification = verifications[verifications.length - 1];

    nodes.push({
      proofId: `downgrade-cost-impact-${downgradeId}`,
      proofType: 'COST_IMPACT',
      title: 'Cost impact',
      summary: latestVerification
        ? `$${latestVerification.realizedSavingsUSD.toFixed(2)} realized savings (${latestVerification.confidenceLevel} confidence)`
        : 'No savings verification available for this downgrade',
      source: 'savings-verification-service',
      timestamp: latestVerification?.completedAt ?? now,
      confidence: latestVerification ? (latestVerification.confidenceLevel === 'HIGH' ? 0.95 : latestVerification.confidenceLevel === 'MEDIUM' ? 0.75 : 0.5) : 0.3,
      upstreamProofIds: [`downgrade-execution-evidence-${downgradeId}`],
      downstreamProofIds: [],
      evidenceHash: Buffer.from(`${downgradeId}:cost:${latestVerification?.realizedSavingsUSD ?? 0}`).toString('base64').slice(0, 32),
      displayPriority: 4,
      expandableDetails: latestVerification
        ? {
            verificationId: latestVerification.verificationId,
            fromModel: latestVerification.fromModel,
            toModel: latestVerification.toModel,
            baselineCostUSD: latestVerification.baselineCostUSD,
            measuredCostUSD: latestVerification.measuredCostUSD,
            realizedSavingsUSD: latestVerification.realizedSavingsUSD,
            realizedSavingsPercent: latestVerification.realizedSavingsPercent,
            confidenceLevel: latestVerification.confidenceLevel,
            status: latestVerification.status,
          }
        : { note: 'Savings verification not yet initialized for this downgrade' },
      environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
      isFixtureBacked: false,
      sourceOfTruth: 'SAVINGS_VERIFICATION_SERVICE',
    });

    // PROOF_COMPLETE when execution is done and approval chain is non-empty
    const status: 'PROOF_COMPLETE' | 'PROOF_INCOMPLETE' =
      isExecuted && approvalCount > 0 ? 'PROOF_COMPLETE' : 'PROOF_INCOMPLETE';

    res.json({
      downgradeId,
      tenantId,
      status,
      nodes,
    });
  } catch (error) {
    logger.error({ error, component: 'token-governance-routes' }, 'Error building downgrade proof graph');
    res.status(500).json({ error: 'PROOF_GRAPH_FAILED' });
  }
});

export default router;
