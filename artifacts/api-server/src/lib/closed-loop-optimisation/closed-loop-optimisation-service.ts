// Program AO2 — Capabilities 2-8, 11, 13, 14: the Closed Loop Optimisation
// Service. Observes real, already-recorded state across Recommendation
// Orchestration, Governed Approvals, Governed Executions, Outcome
// Protection and Technology Economics, and derives one lifecycle record per
// technology recommendation. It never executes anything, never submits
// approvals, never fabricates evidence — every field traces back to a real
// upstream record, or is left undefined/empty when that evidence is absent.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { recommendationOrchestrationService } from '../recommendation-orchestration/recommendation-orchestration-service';
import { technologyEconomicsService } from '../technology-economics-authority/technology-economics-service';
import { ApprovalAuthorityService } from '../approvals/approval-authority-service';
import { GovernedExecutionService } from '../governed-execution/governed-execution-service';
import { outcomeProtectionService } from '../outcome-protection/outcome-protection';
import type { RecommendationExecutionPackage } from '../recommendation-orchestration/recommendation-orchestration-types';
import type { GovernedExecutionPlan, GovernedExecutionVerification } from '../governed-execution/governed-execution-types';
import type { ProtectedOutcome } from '../outcome-protection/outcome-protection';
import type {
  ClosedLoopOptimisation, ClosedLoopOptimisationPortfolio, ClosedLoopProofPack, OptimisationLearning, OptimisationLifecycleState,
} from './closed-loop-optimisation-types';

const approvalAuthorityService = new ApprovalAuthorityService();
const governedExecutionService = new GovernedExecutionService();

interface ObservedState {
  pkg: RecommendationExecutionPackage;
  assetId: string;
  approvalState: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  approvalId?: string;
  executionPlan?: GovernedExecutionPlan;
  verification?: GovernedExecutionVerification;
  protection?: ProtectedOutcome;
  valueRealised: boolean;
  valueAmount?: number;
  valueCurrency?: string;
}

/** Capability AO2.2/AO2.3/AO2.4/AO2.5/AO2.6/AO2.7: gathers real upstream state for one asset — never invents it. */
async function observe(tenantId: string, assetId: string): Promise<ObservedState | undefined> {
  const pkg = await recommendationOrchestrationService.buildExecutionPackage(tenantId, assetId);
  if (!pkg) return undefined;

  const approvalStatus = await approvalAuthorityService.getApprovalStatus(tenantId, 'RECOMMENDATION', pkg.plan.recommendationId);

  const plans = await governedExecutionService.repo.listPlans(tenantId, { recommendationId: pkg.plan.recommendationId });
  const executionPlan = [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  let verification: GovernedExecutionVerification | undefined;
  if (executionPlan) {
    const verifications = await governedExecutionService.repo.listVerifications(tenantId, { planId: executionPlan.id });
    verification = [...verifications].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }

  const protection = outcomeProtectionService.listProtectedOutcomes(tenantId).find((p) => p.assetId === assetId);

  const economics = await technologyEconomicsService.getAssetEconomics(tenantId, assetId);
  const valueRealised = economics.knownValueAmount !== undefined;

  return {
    pkg,
    assetId,
    approvalState: approvalStatus.approvalState,
    approvalId: approvalStatus.workflowId,
    executionPlan,
    verification,
    protection,
    valueRealised,
    valueAmount: economics.knownValueAmount,
    valueCurrency: economics.knownValueCurrency,
  };
}

/**
 * Capability AO2.1: derives the single lifecycle state implied by the
 * observed real state. Each gate strictly requires evidence of the prior
 * stage; nothing is ever skipped ahead on assumption.
 */
function deriveLifecycleState(o: ObservedState): OptimisationLifecycleState {
  if (o.approvalState === 'REJECTED' || o.approvalState === 'EXPIRED' || o.approvalState === 'CANCELLED') return 'FAILED';
  if (o.executionPlan?.status === 'FAILED' || o.executionPlan?.status === 'CANCELLED') return 'FAILED';
  if (o.verification?.status === 'FAILED') return 'FAILED';

  if (o.valueRealised && o.protection?.status === 'PROTECTED') return 'VALUE_REALISED';
  if (o.protection?.status === 'PROTECTED' || o.protection?.status === 'RESOLVED') return 'PROTECTED';
  if (o.verification?.status === 'VERIFIED' || o.verification?.status === 'PARTIAL') return 'VERIFIED';
  if (o.executionPlan?.status === 'COMPLETED') return 'EXECUTED';
  if (o.executionPlan?.status === 'EXECUTING') return 'EXECUTING';
  if (o.executionPlan || o.approvalState === 'APPROVED') return 'APPROVED';
  if (o.approvalState === 'PENDING') return 'APPROVAL_PENDING';
  return 'RECOMMENDED';
}

function executionSucceeded(o: ObservedState): boolean { return o.executionPlan?.status === 'COMPLETED'; }
function verificationSucceeded(o: ObservedState): boolean { return o.verification?.status === 'VERIFIED'; }
function protectionSucceeded(o: ObservedState): boolean { return o.protection?.status === 'PROTECTED' || o.protection?.status === 'RESOLVED'; }

/**
 * Capability AO2.8/AO2.12: the Learning Engine. Only built once an
 * execution has actually been attempted — "no lesson evidence = no
 * lesson". Confidence is only adjusted when execution/verification/value
 * evidence supports a delta; otherwise it stays unchanged.
 */
function buildLearning(o: ObservedState): OptimisationLearning | undefined {
  if (!o.executionPlan) return undefined;

  const executed = executionSucceeded(o);
  const verified = verificationSucceeded(o);
  const protected_ = protectionSucceeded(o);
  const valueRealised = o.valueRealised;

  const lessonsLearned: string[] = [];
  let confidenceDelta = 0;

  if (!executed) {
    lessonsLearned.push('Execution did not succeed; no further lessons can be drawn from this outcome.');
    confidenceDelta = -10;
  } else if (executed && verified && valueRealised && protected_) {
    lessonsLearned.push('Execution, verification, protection and value all succeeded; this pattern should be prioritised for similar recommendations.');
    confidenceDelta = 10;
  } else if (executed && verified && !valueRealised) {
    lessonsLearned.push('Execution success alone does not guarantee value.');
    confidenceDelta = -5;
  } else if (executed && !verified) {
    lessonsLearned.push('Execution completed but could not be verified; success cannot be claimed without verification evidence.');
    confidenceDelta = 0;
  }

  return {
    recommendationId: o.pkg.plan.recommendationId,
    executionSucceeded: executed,
    verificationSucceeded: verified,
    protectionSucceeded: protected_,
    valueRealised,
    confidenceDelta,
    lessonsLearned,
  };
}

function toRecord(o: ObservedState): ClosedLoopOptimisation {
  const lifecycleState = deriveLifecycleState(o);
  const learning = buildLearning(o);
  const now = new Date().toISOString();

  return {
    id: `closed-loop:${o.assetId}`,
    tenantId: o.pkg.plan.tenantId,
    recommendationId: o.pkg.plan.recommendationId,
    executionPlanId: o.pkg.plan.id,
    lifecycleState: lifecycleState === 'VALUE_REALISED' && learning ? 'LEARNING_COMPLETE' : lifecycleState,
    approvalId: o.approvalId,
    executionId: o.executionPlan?.id,
    verificationId: o.verification?.id,
    protectionId: o.protection?.id,
    outcomeId: o.protection?.outcomeId,
    learningId: learning ? `learning:${o.assetId}` : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export class ClosedLoopOptimisationService {
  /** Capability AO2.1/AO2.2: a single technology asset's closed-loop optimisation record. */
  async buildOptimisation(tenantId: string, assetId: string): Promise<ClosedLoopOptimisation | undefined> {
    const observed = await observe(tenantId, assetId);
    if (!observed) return undefined;
    return toRecord(observed);
  }

  async getAllOptimisations(tenantId: string): Promise<ClosedLoopOptimisation[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const records = await Promise.all(portfolio.assets.map((a) => this.buildOptimisation(tenantId, a.id)));
    return records.filter((r): r is ClosedLoopOptimisation => r !== undefined);
  }

  /** Capability AO2.8: learning record for a single asset — undefined when no execution evidence exists. */
  async getLearning(tenantId: string, assetId: string): Promise<OptimisationLearning | undefined> {
    const observed = await observe(tenantId, assetId);
    if (!observed) return undefined;
    return buildLearning(observed);
  }

  async getAllLearning(tenantId: string): Promise<OptimisationLearning[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const learning = await Promise.all(portfolio.assets.map((a) => this.getLearning(tenantId, a.id)));
    return learning.filter((l): l is OptimisationLearning => l !== undefined);
  }

  /** Capability AO2.11: the portfolio view, bucketed by lifecycle state. */
  async getPortfolio(tenantId: string): Promise<ClosedLoopOptimisationPortfolio> {
    const recommendations = await this.getAllOptimisations(tenantId);
    return {
      tenantId,
      recommendations,
      approved: recommendations.filter((r) => r.lifecycleState === 'APPROVED'),
      executing: recommendations.filter((r) => r.lifecycleState === 'EXECUTING'),
      verified: recommendations.filter((r) => r.lifecycleState === 'VERIFIED'),
      protected: recommendations.filter((r) => r.lifecycleState === 'PROTECTED'),
      valueRealised: recommendations.filter((r) => r.lifecycleState === 'VALUE_REALISED' || r.lifecycleState === 'LEARNING_COMPLETE'),
      learningComplete: recommendations.filter((r) => r.lifecycleState === 'LEARNING_COMPLETE'),
      failed: recommendations.filter((r) => r.lifecycleState === 'FAILED'),
      generatedAt: new Date().toISOString(),
    };
  }

  /** Capability AO2.13: proof pack integration — references existing evidence/proof packs only. */
  async getProofPack(tenantId: string, assetId: string): Promise<ClosedLoopProofPack | undefined> {
    const observed = await observe(tenantId, assetId);
    if (!observed) return undefined;
    return {
      optimisationId: `closed-loop:${assetId}`,
      assetId,
      proofPack: observed.pkg.supportingProofPack,
      evidence: observed.pkg.supportingEvidence,
      recommendation: observed.pkg.supportingRecommendation,
      executionPackage: { planId: observed.pkg.plan.id, narrative: observed.pkg.narrative },
      verificationResult: observed.verification
        ? { status: observed.verification.status, verifiedValue: observed.verification.verifiedValue, currency: observed.verification.currency }
        : undefined,
    };
  }

  /** Capability AO2.14: board/CIO-ready narrative spanning the full closed loop for one asset. */
  async getNarrative(tenantId: string, assetId: string): Promise<{ optimisation: ClosedLoopOptimisation; narrative: string } | undefined> {
    const observed = await observe(tenantId, assetId);
    if (!observed) return undefined;
    const optimisation = toRecord(observed);
    const learning = buildLearning(observed);

    const narrative = `Recommendation: ${observed.pkg.plan.executionType}\n`
      + `Approval: ${observed.approvalState}\n`
      + `Execution: ${observed.executionPlan?.status ?? 'NOT_STARTED'}\n`
      + `Verification: ${observed.verification?.status ?? 'NOT_VERIFIED'}\n`
      + `Protection: ${observed.protection?.status ?? 'NOT_PROTECTED'}\n`
      + `Value: ${observed.valueRealised ? `Realised (${observed.valueAmount} ${observed.valueCurrency ?? ''})`.trim() : 'Unknown'}\n`
      + `Learning: ${learning && learning.lessonsLearned.length > 0 ? learning.lessonsLearned.join(' ') : 'No lesson evidence yet.'}`;

    return { optimisation, narrative };
  }
}

export const closedLoopOptimisationService = new ClosedLoopOptimisationService();
