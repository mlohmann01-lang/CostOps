// Program CX1 — Capabilities 2/4/5/6/8: Executive Experience Consolidation.
//
// Executives should see only Value, Risk, Investment, Decisions, and
// Actions — never the names of underlying authorities. This service never
// rebuilds any business logic; it only joins/aggregates outputs already
// produced by EX1 (Executive Command Center), EX2 (Executive Decision
// Authority), Executive Proof Packs, the governed action pipeline, and the
// Program 15 Authority Registry (via the consolidation layer).

import { executiveCommandCenterService } from '../executive-command-center/executive-command-center-service';
import { executiveDecisionAuthorityService } from '../executive-decision-authority/executive-decision-authority-service';
import { ExecutiveProofPackService } from '../executive-proof-packs';
import { governedActionService, type GovernedActionStatus } from '../actions/governed-actions';
import { getSecurityHardeningAuthority } from '../security-hardening/security-hardening-verification-authority';
import { getTenantIsolationAuthority } from '../tenant-isolation/tenant-isolation-authority';
import { getInformationGovernanceAuthority } from '../information-governance/information-governance-authority';
import { technologyInvestmentService } from '../technology-investment-authority/technology-investment-service';
import { technologyEconomicsService } from '../technology-economics-authority/technology-economics-service';
import { technologyCapitalAllocationDecisionService } from '../technology-capital-allocation-authority/technology-capital-allocation-authority-service';
import { getTechnologyInvestmentAuthority } from '../technology-investment-authority/technology-investment-authority';
import { getTechnologyEconomicsAuthority } from '../technology-economics-authority/technology-economics-authority';
import { getTechnologyCapitalAllocationAuthority } from '../technology-capital-allocation-authority/technology-capital-allocation-authority';
import { getConsolidatedAuthorityViews } from './executive-experience-consolidation';
import type { ExecutiveDecisionRecord } from '../executive-decision-authority/executive-decision-authority-types';

const executiveProofPackService = new ExecutiveProofPackService();

// CX1.4: decision buckets the executive cares about. KEEP technologies
// require no executive action (per EX2) and are therefore excluded from
// getAllDecisions already — they never appear here.
type ExecutiveDecisionBucket = 'Retire' | 'Renew' | 'Optimise' | 'Expand' | 'Review';

const BUCKET_BY_DECISION: Record<string, ExecutiveDecisionBucket> = {
  APPROVE_RETIREMENT: 'Retire',
  APPROVE_RENEWAL: 'Renew',
  APPROVE_OPTIMISATION: 'Optimise',
  APPROVE_CONSOLIDATION: 'Optimise',
  APPROVE_EXPANSION: 'Expand',
  REQUIRE_REVIEW: 'Review',
  INSUFFICIENT_EVIDENCE: 'Review',
};

export interface ExecutiveDecisionRow {
  decision: ExecutiveDecisionRecord['decision'];
  confidence: ExecutiveDecisionRecord['executiveConfidence'];
  evidence: string[];
  proofPackAvailability: ExecutiveDecisionRecord['proofPackAvailability'];
  assetId: string;
  assetName: string;
  value?: number;
  spend?: number;
}

export interface ExecutiveDecisionBuckets {
  tenantId: string;
  Retire: ExecutiveDecisionRow[];
  Renew: ExecutiveDecisionRow[];
  Optimise: ExecutiveDecisionRow[];
  Expand: ExecutiveDecisionRow[];
  Review: ExecutiveDecisionRow[];
  generatedAt: string;
}

// CX1.8: action center buckets. The governed action pipeline tracks a
// richer status lifecycle than these five buckets — this mapping is a
// judgment call collapsing the real GovernedActionStatus union into the
// executive-facing five-stage view without inventing new statuses.
const ACTION_BUCKET_BY_STATUS: Record<GovernedActionStatus, 'Pending' | 'Approved' | 'Executing' | 'Completed' | 'Failed'> = {
  DISCOVERED: 'Pending',
  PRIORITISED: 'Pending',
  READY: 'Pending',
  AWAITING_APPROVAL: 'Pending',
  APPROVED: 'Approved',
  QUEUED: 'Approved',
  EXECUTING: 'Executing',
  EXECUTED: 'Executing',
  VERIFYING: 'Executing',
  VERIFIED: 'Completed',
  RETAINED: 'Completed',
  CLOSED: 'Completed',
  CANCELLED: 'Failed',
  REJECTED: 'Failed',
  DRIFTED: 'Failed',
};

export class ExecutiveExperienceService {
  /** CX1.2: composite executive dashboard — sections: value, investment, decisions, risk, actions. */
  async getDashboard(tenantId: string) {
    const [commandCenterDashboard, decisionSummary, proofPackSummary, actions] = await Promise.all([
      executiveCommandCenterService.getDashboard(tenantId),
      executiveDecisionAuthorityService.getSummary(tenantId),
      executiveProofPackService.summariseTenantProofPacks(tenantId),
      governedActionService.dashboard(tenantId),
    ]);

    return {
      tenantId,
      value: {
        totalAssets: commandCenterDashboard.portfolio.totalAssets,
        knownSpend: commandCenterDashboard.economics.knownSpend,
        knownValue: commandCenterDashboard.economics.knownValue,
        roiCoverage: commandCenterDashboard.economics.roiCoverage,
      },
      investment: {
        totalTechnologies: commandCenterDashboard.recommendations.totalTechnologies,
        expandCount: commandCenterDashboard.recommendations.expandCount,
        optimiseCount: commandCenterDashboard.recommendations.optimiseCount + commandCenterDashboard.recommendations.consolidateCount,
        renewCount: commandCenterDashboard.recommendations.renewCount,
        retireCount: commandCenterDashboard.recommendations.retireCount,
        reviewCount: commandCenterDashboard.recommendations.reviewCount,
      },
      decisions: {
        totalTechnologies: decisionSummary.totalTechnologies,
        approveExpansionCount: decisionSummary.approveExpansionCount,
        approveRenewalCount: decisionSummary.approveRenewalCount,
        approveOptimisationCount: decisionSummary.approveOptimisationCount + decisionSummary.approveConsolidationCount,
        approveRetirementCount: decisionSummary.approveRetirementCount,
        requireReviewCount: decisionSummary.requireReviewCount + decisionSummary.insufficientEvidenceCount,
        averageExecutiveConfidence: decisionSummary.averageExecutiveConfidence,
        proofPackReadyCount: proofPackSummary.readyCount,
        proofPackCount: proofPackSummary.packCount,
      },
      risk: commandCenterDashboard.risk,
      actions: {
        pending: actions.ready + actions.awaitingApproval,
        approved: actions.approved,
        executing: actions.executing + actions.verifying,
        completed: actions.verified + actions.retained,
        blocked: actions.blocked,
        projectedValue: actions.projectedValue,
        verifiedValue: actions.verifiedValue,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /** CX1.4: executive decisions grouped into Retire/Renew/Optimise/Expand/Review, joined with value/spend. */
  async getDecisions(tenantId: string): Promise<ExecutiveDecisionBuckets> {
    const [decisions, investmentRows] = await Promise.all([
      executiveDecisionAuthorityService.getAllDecisions(tenantId),
      executiveCommandCenterService.getInvestmentView(tenantId),
    ]);
    const investmentByAsset = new Map(investmentRows.map((r) => [r.assetId, r]));

    const buckets: ExecutiveDecisionBuckets = {
      tenantId, Retire: [], Renew: [], Optimise: [], Expand: [], Review: [],
      generatedAt: new Date().toISOString(),
    };

    for (const decision of decisions) {
      const bucket = BUCKET_BY_DECISION[decision.decision];
      if (!bucket) continue;
      const investment = investmentByAsset.get(decision.assetId);
      buckets[bucket].push({
        decision: decision.decision,
        confidence: decision.executiveConfidence,
        evidence: decision.evidence,
        proofPackAvailability: decision.proofPackAvailability,
        assetId: decision.assetId,
        assetName: decision.assetName,
        value: investment?.value,
        spend: investment?.spend,
      });
    }

    return buckets;
  }

  /** CX1.5: executive risk view — ownership/evidence (EX1) plus security/governance risk and economics/renewal risk, all reused as-is. */
  async getRisks(tenantId: string) {
    const [riskView, security, tenantIsolation, governance, investmentAuthority, economicsAuthority, capitalAllocationAuthority] = await Promise.all([
      executiveCommandCenterService.getRiskView(tenantId),
      Promise.resolve(getSecurityHardeningAuthority()),
      Promise.resolve(getTenantIsolationAuthority()),
      Promise.resolve(getInformationGovernanceAuthority()),
      getTechnologyInvestmentAuthority(tenantId),
      getTechnologyEconomicsAuthority(tenantId),
      getTechnologyCapitalAllocationAuthority(tenantId),
    ]);

    return {
      tenantId,
      ownership: {
        missingOwnership: riskView.missingOwnership,
        missingCapabilityMapping: riskView.missingCapabilityMapping,
      },
      evidence: {
        missingEvidence: riskView.missingEvidence,
        graphGaps: riskView.graphGaps,
      },
      economics: {
        missingEconomics: riskView.missingEconomics,
        economicsVerdict: economicsAuthority.verdict,
        economicsScore: economicsAuthority.score,
        capitalAllocationVerdict: capitalAllocationAuthority.verdict,
        capitalAllocationScore: capitalAllocationAuthority.score,
      },
      renewal: {
        missingRenewals: riskView.missingRenewals,
        investmentGraphVerdict: investmentAuthority.verdict,
        investmentGraphGapCount: investmentAuthority.gapCount,
      },
      security: {
        platformVerdict: security.platformVerdict,
        tenantIsolationReadiness: tenantIsolation.readiness,
        informationGovernanceReadiness: governance.readiness,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /** CX1.6: thin proof pack wrapper, grouped by pack type for executive display ('OPERATOR' is shown as 'Operations'). */
  async getProofPacks(tenantId: string) {
    const summary = await executiveProofPackService.summariseTenantProofPacks(tenantId);
    const packs = await executiveProofPackService.repo.listPacks(tenantId);

    const DISPLAY_LABEL: Record<string, string> = {
      BOARD: 'Board', CFO: 'CFO', CIO: 'CIO', PROCUREMENT: 'Procurement', AUDIT: 'Audit', OPERATOR: 'Operations',
    };

    const byType: Record<string, { label: string; count: number; readyCount: number; packIds: string[] }> = {};
    for (const pack of packs) {
      const key = pack.packType;
      if (!byType[key]) byType[key] = { label: DISPLAY_LABEL[key] ?? key, count: 0, readyCount: 0, packIds: [] };
      byType[key].count += 1;
      if (pack.status === 'READY') byType[key].readyCount += 1;
      byType[key].packIds.push(pack.id);
    }

    return { tenantId, summary, byType, generatedAt: new Date().toISOString() };
  }

  /** CX1.8: Action Center — buckets governed actions into Pending/Approved/Executing/Completed/Failed, plus an honest per-domain breakdown limited to domains the governed action pipeline actually tracks (M365/AI/SAAS/CLOUD/ITAM/DATA/OTHER). No fabricated per-connector (AWS/Snowflake/Databricks/ServiceNow) breakdown exists beyond what these domains already represent. */
  async getActions(tenantId: string) {
    const actions = await governedActionService.list(tenantId);

    const buckets = { Pending: 0, Approved: 0, Executing: 0, Completed: 0, Failed: 0 };
    const byDomain: Record<string, { Pending: number; Approved: number; Executing: number; Completed: number; Failed: number }> = {};

    for (const action of actions) {
      const bucket = ACTION_BUCKET_BY_STATUS[action.status] ?? 'Pending';
      buckets[bucket] += 1;
      if (!byDomain[action.domain]) byDomain[action.domain] = { Pending: 0, Approved: 0, Executing: 0, Completed: 0, Failed: 0 };
      byDomain[action.domain][bucket] += 1;
    }

    return {
      tenantId,
      totalActions: actions.length,
      buckets,
      byDomain,
      generatedAt: new Date().toISOString(),
    };
  }

  /** CX1.1: static executive navigation tree. `consumes` documents which authorities/services each item reads from, for internal traceability only — never exposed verbatim as authority names in the executive UI. */
  getNavigation() {
    return [
      { id: 'home', label: 'Home', path: '/executive', consumes: ['executive-command-center', 'executive-decision-authority', 'executive-proof-packs', 'governed-actions'] },
      { id: 'value', label: 'Value', path: '/executive/value', consumes: ['executive-command-center'] },
      { id: 'investment', label: 'Investment', path: '/executive/investment', consumes: ['technology-investment-authority', 'technology-economics-authority', 'technology-capital-allocation-authority'] },
      { id: 'decisions', label: 'Decisions', path: '/executive/decisions', consumes: ['executive-decision-authority'] },
      { id: 'risks', label: 'Risks', path: '/executive/risks', consumes: ['executive-command-center', 'security-hardening', 'tenant-isolation', 'information-governance'] },
      { id: 'proof-packs', label: 'Proof Packs', path: '/executive/proof-packs', consumes: ['executive-proof-packs'] },
      { id: 'actions', label: 'Actions', path: '/executive/actions', consumes: ['governed-actions'] },
    ];
  }

  /** CX1.9: simple, non-destructive reporting of conceptual overlaps across existing executive-facing routes. Flags only — never deletes or merges anything. */
  getConsolidationFindings(): Array<{ type: string; description: string }> {
    return [
      {
        type: 'DUPLICATE_DASHBOARD_SURFACE',
        description: 'Executive Command Center (/api/executive-command-center/dashboard) and Executive Experience (/api/executive-experience/dashboard) both expose dashboard aggregation. The latter is a thin composition layer over the former and over Executive Decision Authority/Proof Packs/Actions — it intentionally adds no new business logic, but the two endpoints overlap conceptually for any future UI consumer choosing between them.',
      },
      {
        type: 'DUPLICATE_RISK_SURFACE',
        description: 'Executive risk data is reachable from three places today: /api/executive-command-center (risk view), /api/executive-experience/risks (this consolidation, which also folds in security/tenant-isolation/information-governance), and /api/executive-risk (the legacy governance-graph-based risk command center). Consumers should standardise on one before deprecating the others.',
      },
      {
        type: 'AUTHORITY_NAME_LEAKAGE_RISK',
        description: 'Several existing executive routes (e.g. executive-command-center, executive-decision-authority) return raw authority-shaped JSON (verdict/score/reasoning fields) directly to API consumers. The CX1 consolidation layer (executive-experience-consolidation.ts) hides authority identity behind category/readiness, but any client still calling the legacy authority routes directly bypasses that abstraction.',
      },
    ];
  }
}

export const executiveExperienceService = new ExecutiveExperienceService();

export { getConsolidatedAuthorityViews } from './executive-experience-consolidation';
