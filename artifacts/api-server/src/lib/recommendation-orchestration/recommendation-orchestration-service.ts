// Program AO1 — Capabilities 2-9: execution package builder, approval
// analysis, execution readiness, execution complexity, recommendation
// narratives and the orchestration queue. Reuses Technology Capital
// Allocation recommendations, the Technology Value Graph and the Executive
// Proof Pack authority — never executes anything, only prepares packages.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { technologyCapitalAllocationDecisionService } from '../technology-capital-allocation-authority/technology-capital-allocation-authority-service';
import { scenarioPlanningService } from '../scenario-planning/scenario-planning-service';
import { ExecutiveProofPackService } from '../executive-proof-packs';
import type { TechnologyAllocationDecision, TechnologyCapitalAllocationRecommendation } from '../technology-capital-allocation-authority/technology-capital-allocation-authority-types';
import type { TechnologyPortfolioAsset } from '../technology-portfolio-authority/technology-portfolio-types';
import type {
  RecommendationExecutionPackage, RecommendationExecutionPlan, RecommendationOrchestrationExecutionType,
  RecommendationOrchestrationQueue, RecommendationOrchestrationReadiness,
} from './recommendation-orchestration-types';

const executiveProofPackService = new ExecutiveProofPackService();

const EXECUTABLE_DECISIONS: RecommendationOrchestrationExecutionType[] = ['RETIRE', 'RENEW', 'OPTIMISE', 'EXPAND', 'CONSOLIDATE'];

function isExecutable(decision: TechnologyAllocationDecision): decision is RecommendationOrchestrationExecutionType {
  return (EXECUTABLE_DECISIONS as string[]).includes(decision);
}

/** Capability AO1.3: required approvals — derived from real ownership/criticality/vendor data, never invented. */
function requiredApprovals(asset: TechnologyPortfolioAsset | undefined): string[] {
  const approvals: string[] = [];
  if (asset?.ownerUserId) approvals.push('Technology Owner Approval');
  if (asset?.executiveOwnerId) approvals.push('Executive Approval');
  if (asset?.vendorId) approvals.push('Procurement Approval');
  if (asset && (asset.criticality === 'HIGH' || asset.criticality === 'CRITICAL')) approvals.push('Security Approval');
  return approvals;
}

/** Capability AO1.9: execution systems — reuses the asset's own recorded source systems, plus its lifecycle's natural execution surface. */
function executionSystems(asset: TechnologyPortfolioAsset | undefined): string[] {
  if (!asset) return [];
  const systems = new Set<string>(asset.sourceSystems);
  if (asset.assetType === 'SAAS') { systems.add('ITAM'); systems.add('Identity'); }
  if (asset.assetType === 'CLOUD_SERVICE') systems.add('ITAM');
  if (asset.vendorId) systems.add('ITAM');
  return [...systems];
}

/** Capability AO1.5: execution complexity — derived from real graph impact counts, never estimated. */
async function estimatedComplexity(tenantId: string, executionType: RecommendationOrchestrationExecutionType, assetId: string, systemsCount: number): Promise<'LOW' | 'MEDIUM' | 'HIGH'> {
  const impact = await scenarioPlanningService.analyzeScenario(tenantId, executionType, 'TECHNOLOGY', assetId);
  const score = impact.impactedAssets + impact.impactedCapabilities + impact.impactedRenewals + systemsCount;
  if (score >= 6) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  return 'LOW';
}

/** Capability AO1.4: execution readiness — ownership, evidence, approvals and a real execution path must all be present. */
function deriveReadiness(opts: { ownerPresent: boolean; hasEvidence: boolean; approvals: string[]; systems: string[] }): { readiness: RecommendationOrchestrationReadiness; blockers: string[] } {
  const blockers: string[] = [];
  if (!opts.ownerPresent) blockers.push('No ownership is recorded; an owner approval cannot be assigned.');
  if (!opts.hasEvidence) blockers.push('No evidence is recorded supporting this recommendation.');
  if (opts.systems.length === 0) blockers.push('No execution system is known for this technology.');

  if (blockers.length === 0) return { readiness: 'READY', blockers };
  if (opts.ownerPresent && opts.systems.length > 0) return { readiness: 'PARTIAL', blockers };
  return { readiness: 'NOT_READY', blockers };
}

/**
 * Capability AO1.1: which execution type this asset's own already-recorded lifecycle status calls
 * for — RETIRE_CANDIDATE/RENEWAL_RISK are real, tenant-recorded signals, not fabricated. Falling back
 * to the Technology Capital Allocation decision lets assets without a clear lifecycle signal still
 * reach EXPAND/OPTIMISE/CONSOLIDATE recommendations. Ownership/evidence gaps on a RETIRE_CANDIDATE or
 * RENEWAL_RISK asset must still produce a plan — they are reported as readiness blockers (AO1.4),
 * never used to suppress the plan outright.
 */
function executionTypeFor(asset: TechnologyPortfolioAsset | undefined, decision: TechnologyAllocationDecision): RecommendationOrchestrationExecutionType | undefined {
  if (asset?.lifecycleStatus === 'RETIRE_CANDIDATE') return 'RETIRE';
  if (asset?.lifecycleStatus === 'RENEWAL_RISK') return 'RENEW';
  return isExecutable(decision) ? decision : undefined;
}

export class RecommendationOrchestrationService {
  /** Capabilities AO1.1-AO1.5: a single execution plan for a technology asset's allocation recommendation. */
  async buildExecutionPlan(tenantId: string, assetId: string): Promise<RecommendationExecutionPlan | undefined> {
    const recommendation = await technologyCapitalAllocationDecisionService.getAssetAllocation(tenantId, assetId);
    const asset = await technologyPortfolioAuthorityService.summariseAsset(tenantId, assetId);
    const executionType = executionTypeFor(asset, recommendation.decision);
    if (!executionType) return undefined;

    const approvals = requiredApprovals(asset);
    const systems = executionSystems(asset);
    const hasEvidence = Boolean(asset && asset.evidenceRefs.length > 0);
    const { readiness, blockers } = deriveReadiness({ ownerPresent: Boolean(asset?.ownerUserId), hasEvidence, approvals, systems });
    const complexity = await estimatedComplexity(tenantId, executionType, assetId, systems.length);

    return {
      id: `exec-plan:${assetId}`,
      tenantId,
      recommendationId: recommendation.id,
      recommendationType: executionType,
      executionType,
      requiredApprovals: approvals,
      requiredEvidence: asset?.evidenceRefs ?? [],
      executionSystems: systems,
      estimatedComplexity: complexity,
      readiness,
      blockers,
    };
  }

  /** Capability AO1.2/AO1.10: a full execution package — the plan plus its supporting proof pack, evidence, findings and recommendation. */
  async buildExecutionPackage(tenantId: string, assetId: string): Promise<RecommendationExecutionPackage | undefined> {
    const plan = await this.buildExecutionPlan(tenantId, assetId);
    if (!plan) return undefined;

    const asset = await technologyPortfolioAuthorityService.summariseAsset(tenantId, assetId);
    const recommendation = await technologyCapitalAllocationDecisionService.getAssetAllocation(tenantId, assetId);
    const proofPacks = await executiveProofPackService.summariseTenantProofPacks(tenantId);

    const narrative = `Recommendation: ${plan.executionType}\n`
      + `Target: ${asset?.name ?? assetId}\n`
      + `Execution Systems: ${plan.executionSystems.join(', ') || 'none known'}\n`
      + `Approvals: ${plan.requiredApprovals.join(', ') || 'none required'}\n`
      + `Readiness: ${plan.readiness}\n`
      + `Complexity: ${plan.estimatedComplexity}\n`
      + `Evidence: ${recommendation.rationale.join('; ')}.`;

    return {
      plan,
      assetId,
      supportingProofPack: { available: proofPacks.packCount > 0, packCount: proofPacks.packCount, readyCount: proofPacks.readyCount },
      supportingEvidence: asset?.evidenceRefs ?? [],
      supportingFindings: recommendation.rationale,
      supportingRecommendation: recommendation.id,
      narrative,
      generatedAt: new Date().toISOString(),
    };
  }

  async getAllExecutionPlans(tenantId: string): Promise<RecommendationExecutionPlan[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const plans = await Promise.all(portfolio.assets.map((a) => this.buildExecutionPlan(tenantId, a.id)));
    return plans.filter((p): p is RecommendationExecutionPlan => p !== undefined);
  }

  async getAllExecutionPackages(tenantId: string): Promise<RecommendationExecutionPackage[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const packages = await Promise.all(portfolio.assets.map((a) => this.buildExecutionPackage(tenantId, a.id)));
    return packages.filter((p): p is RecommendationExecutionPackage => p !== undefined);
  }

  /** Capability AO1.6: board/CIO-ready recommendation narrative for a single technology asset. */
  async getNarrative(tenantId: string, assetId: string): Promise<{ plan: RecommendationExecutionPlan; narrative: string } | undefined> {
    const pkg = await this.buildExecutionPackage(tenantId, assetId);
    if (!pkg) return undefined;
    return { plan: pkg.plan, narrative: pkg.narrative };
  }

  /** Capability AO1.7: the orchestration queue, bucketed by what each plan is waiting on. */
  async getQueue(tenantId: string): Promise<RecommendationOrchestrationQueue> {
    const plans = await this.getAllExecutionPlans(tenantId);
    const readyForExecution = plans.filter((p) => p.readiness === 'READY');
    const notReady = plans.filter((p) => p.readiness !== 'READY');

    const missingEvidence = (p: RecommendationExecutionPlan) => p.blockers.some((b) => b.includes('evidence'));
    const missingExecutionPath = (p: RecommendationExecutionPlan) => p.readiness === 'NOT_READY' && p.blockers.some((b) => b.includes('ownership') || b.includes('execution system'));

    const blocked = notReady.filter(missingExecutionPath);
    const awaitingEvidence = notReady.filter((p) => !missingExecutionPath(p) && missingEvidence(p));
    const awaitingApproval = notReady.filter((p) => !missingExecutionPath(p) && !missingEvidence(p));

    return {
      tenantId, readyForExecution, awaitingApproval, awaitingEvidence, blocked,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const recommendationOrchestrationService = new RecommendationOrchestrationService();
