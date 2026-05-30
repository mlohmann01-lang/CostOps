import type { GovernedRecommendationRepository } from "./recommendation-repository";
import type { RecommendationExplainability, TrustResolution } from "./explainability-types";
import { buildFindingsFromReasons } from "./trust-resolution-service";
import { trustBandForScore } from "../trust/trust-score-engine";

function arr(value: unknown): string[] { return Array.isArray(value) ? value.map((x) => String(x)) : []; }
function projected(row: any): number { return Number(row?.projectedAnnualSavings ?? (Number(row?.projectedMonthlySavings ?? 0) * 12)); }
function blocked(row: any): boolean { return String(row?.executionReadiness ?? "").toUpperCase().includes("BLOCK") || arr(row?.blockedReasons).length > 0; }
function trustBand(row: any) { const raw = Number(row?.confidenceScore ?? 0); return trustBandForScore(raw <= 1 ? raw * 100 : raw); }

export class RecommendationExplainabilityService {
  constructor(private readonly repo: GovernedRecommendationRepository) {}

  async explain(tenantId: string, recommendationId: string): Promise<RecommendationExplainability | null> {
    const row = await this.repo.getByRecommendationId(tenantId, recommendationId) as any;
    if (!row) return null;
    const reasons = [...arr(row.blockedReasons), ...arr(row.readinessReasons)];
    const annual = projected(row);
    const blockedValue = blocked(row) ? annual : 0;
    const resolution = buildFindingsFromReasons({ recommendationId, reasons, unlockValue: blockedValue });
    const readiness = String(row.executionReadiness ?? "UNKNOWN");
    const safe = readiness.includes("READY") || readiness.includes("APPROVAL");
    const summary = blockedValue > 0
      ? `Blocked because ${reasons[0] ?? "trust or policy evidence is incomplete"}. Resolve this issue to unlock $${Math.round(blockedValue).toLocaleString()} projected annual savings.`
      : safe
        ? "Execution eligible because identity, entitlement, usage, and rollback evidence are complete or approval gated."
        : `Recommendation is ${readiness.toLowerCase()} and requires operator review.`;
    return {
      recommendationId: row.recommendationId,
      tenantId: row.tenantId,
      actionType: row.actionType,
      playbookId: row.playbookId,
      currentState: row.recommendationState,
      readinessState: readiness,
      trustBand: trustBand(row),
      projectedSavings: annual,
      blockedValue,
      explanationSummary: summary,
      evidenceChain: [
        { step: "DISCOVERY_SOURCE", label: "Discovery source", state: arr(row.sourceReferences).length ? "PRESENT" : "MISSING", evidence: { sourceReferences: arr(row.sourceReferences) } },
        { step: "NORMALIZED_ENTITY", label: "Normalized entity", state: row.discoveryLifecycleState ?? "UNKNOWN", evidence: { targetEntityId: row.targetEntityId, targetEntityType: row.targetEntityType, graphNodeIds: row.graphNodeIds } },
        { step: "TRUST_SCORE_INPUTS", label: "Trust score inputs", state: trustBand(row), evidence: { confidenceScore: row.confidenceScore, reliabilityBand: row.reliabilityBand, savingsConfidence: row.savingsConfidence } },
        { step: "READINESS_DECISION", label: "Readiness decision", state: readiness, evidence: { readinessReasons: arr(row.readinessReasons), blockedReasons: arr(row.blockedReasons) } },
        { step: "POLICY_GATE", label: "Policy gate", state: resolution.policyFindings.length > 0 ? "BLOCKED" : "CLEARED", evidence: { requiredApprovals: row.requiredApprovals, actionRiskClass: row.actionRiskClass } },
        { step: "APPROVAL_STATE", label: "Approval state", state: row.approvalState ?? "NOT_SUBMITTED", evidence: { approvalWorkflowId: row.approvalWorkflowId, currentApprovalStage: row.currentApprovalStage } },
        { step: "EXECUTION_REQUEST_STATE", label: "Execution request state", state: row.executionRequestState ?? "NOT_CREATED", evidence: { executionRequestId: row.executionRequestId } },
        { step: "DRY_RUN_STATE", label: "Dry-run state", state: row.executionRequestId ? "AVAILABLE_AFTER_REQUEST" : "NOT_CREATED", evidence: { executionRequestId: row.executionRequestId } },
        { step: "OUTCOME_STATE", label: "Outcome state", state: row.executionRequestState === "VERIFIED" ? "VERIFIED" : "NOT_VERIFIED", evidence: { executionRequestState: row.executionRequestState } },
      ],
      trustFindings: resolution.trustFindings,
      policyFindings: resolution.policyFindings,
      affectedEntities: [{ entityType: row.targetEntityType ?? "ENTITY", entityId: row.targetEntityId, label: row.targetEntityId }],
      resolutionSteps: resolution.resolutionSteps,
      unlockValue: blockedValue,
    };
  }

  async resolution(tenantId: string, recommendationId: string): Promise<TrustResolution | null> {
    const explanation = await this.explain(tenantId, recommendationId);
    if (!explanation) return null;
    return { recommendationId, tenantId, blockedValue: explanation.blockedValue, unlockValue: explanation.unlockValue, resolutionSteps: explanation.resolutionSteps, trustFindings: explanation.trustFindings, policyFindings: explanation.policyFindings };
  }
}
