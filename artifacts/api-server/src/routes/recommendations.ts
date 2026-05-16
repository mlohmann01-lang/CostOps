import { Router } from "express";
import { db } from "@workspace/db";
import { connectorSyncStatusTable, m365UsersTable, recommendationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { assessTrust } from "../lib/trust-engine";
import { evaluateExceptions } from "../lib/governance/exceptions";
import { PLAYBOOK_REGISTRY } from "../lib/playbooks/registry";
import { reliabilityFromHealth } from "../lib/connectors/connector-health";
import { createPlaybookEvaluationEvent } from "../lib/playbooks/evaluation-log";
import { resolveProjectedSavings } from "../lib/pricing/pricing-engine";
import { buildTrustSignalsFromFindings } from "../lib/reconciliation/trust-signal-adapter";
import { RecommendationArbitrationService } from "../lib/recommendations/recommendation-arbitration-service";
import { recommendationArbitrationSnapshotsTable } from "@workspace/db";
import { requireTenantContext } from "../middleware/security-guards";

const router = Router();
const MVP_MODE = true;
router.use(requireTenantContext());

function buildTrustContext(user: any, metadata: any, action: string) {
  const isService = user.userPrincipalName.includes("service") || user.userPrincipalName.includes("noreply");
  return {
    entity_input: {
      identity_confidence: isService ? 0.7 : 1.0,
      source_consistency: 1.0,
      data_freshness: metadata.dataFreshnessScore,
      ownership_confidence: 0.75,
      source_reliability: reliabilityFromHealth(metadata.connectorHealth),
    },
    recommendation_input: {
      usage_signal_quality: user.lastLoginDaysAgo == null ? 0.0 : user.lastLoginDaysAgo > 90 ? 0.85 : 0.7,
      entitlement_confidence: 1.0,
      policy_fit: 0.75,
      savings_confidence: 0.8,
    },
    execution_input: { action_reversibility: 0.75, approval_state: 0.4, blast_radius_score: 1.0, rollback_confidence: 0.75 },
    blocker_context: {
      admin_or_service_account_match: isService,
      connector_health_failed: metadata.connectorHealth === "FAILED",
      source_stale_beyond_sla: metadata.dataFreshnessScore <= 0.2,
      usage_data_missing_for_removal_action: action === "REMOVE_LICENSE" && user.lastLoginDaysAgo == null,
    },
    warnings: metadata.partialData ? ["Partial connector data returned"] : [],
    mvp_mode: MVP_MODE,
  };
}


const arbitrationService = new RecommendationArbitrationService();

router.post("/arbitrate", async (req, res) => {
  const tenantId = String((req as any).tenantId);
  const queue = await arbitrationService.arbitrate(tenantId);
  res.json({ tenantId, count: queue.length, queue });
});

router.get("/arbitration", async (req, res) => {
  const tenantId = String((req as any).tenantId);
  const rows = await db.select().from(recommendationArbitrationSnapshotsTable).where(eq(recommendationArbitrationSnapshotsTable.tenantId, tenantId)).orderBy(desc(recommendationArbitrationSnapshotsTable.createdAt));
  res.json(rows);
});

router.get("/arbitration/:recommendationId", async (req, res) => {
  const tenantId = String((req as any).tenantId);
  const rows = await db.select().from(recommendationArbitrationSnapshotsTable).where(and(eq(recommendationArbitrationSnapshotsTable.tenantId, tenantId), eq(recommendationArbitrationSnapshotsTable.recommendationId, req.params.recommendationId))).orderBy(desc(recommendationArbitrationSnapshotsTable.createdAt));
  res.json(rows[0] ?? null);
});

router.get("/prioritized-queue", async (req, res) => {
  const tenantId = String((req as any).tenantId);
  const rows = await db.select().from(recommendationArbitrationSnapshotsTable).where(eq(recommendationArbitrationSnapshotsTable.tenantId, tenantId)).orderBy(desc(recommendationArbitrationSnapshotsTable.priorityScore), desc(recommendationArbitrationSnapshotsTable.createdAt));
  res.json(rows);
});

router.get("/arbitration/conflicts", async (req, res) => {
  const tenantId = String((req as any).tenantId);
  const rows = await db.select().from(recommendationArbitrationSnapshotsTable).where(eq(recommendationArbitrationSnapshotsTable.tenantId, tenantId)).orderBy(desc(recommendationArbitrationSnapshotsTable.createdAt));
  const grouped = rows.filter((r)=>r.conflictGroupId).reduce((acc:any, row:any)=>{ const key=row.conflictGroupId!; acc[key]=acc[key]??[]; acc[key].push(row); return acc; }, {});
  res.json(grouped);
});

router.get("/", async (req, res) => {
  const tenantId = String((req as any).tenantId);
  const rows = await db.select().from(recommendationsTable).where(eq(recommendationsTable.tenantId, tenantId)).orderBy(recommendationsTable.createdAt);
  res.json(rows);
});

router.post("/generate", async (req, res) => {
  try {
    const tenantId = String((req as any).tenantId);
    const [latestSync] = await db
      .select()
      .from(connectorSyncStatusTable)
      .where(eq(connectorSyncStatusTable.tenantId, tenantId))
      .orderBy(desc(connectorSyncStatusTable.createdAt))
      .limit(1);

    if (!latestSync) {
      return res.status(400).json({ error: "NO_VALID_SYNC" });
    }
    if (latestSync.connectorHealth === "FAILED") {
      return res.status(400).json({ error: "CONNECTOR_HEALTH_FAILED", metadata: latestSync });
    }

    const canonicalUsers = await db
      .select()
      .from(m365UsersTable)
      .where(eq(m365UsersTable.tenantId, tenantId))
      .orderBy(desc(m365UsersTable.updatedAt));

    const generated = [];
    for (const user of canonicalUsers) {
      for (const playbook of PLAYBOOK_REGISTRY) {
        const mapped = { email: user.userPrincipalName, displayName: user.displayName ?? user.userPrincipalName, sku: user.assignedLicenses[0] ?? "UNKNOWN", cost: 57, days: user.lastLoginDaysAgo ?? 999, accountEnabled: user.accountEnabled === "true", assignedLicenses: user.assignedLicenses, userPrincipalName: user.userPrincipalName , mailboxType: user.userPrincipalName.includes("shared") ? "shared" : "user", isSharedMailbox: user.userPrincipalName.includes("shared"), hasDesktopActivity: !user.userPrincipalName.includes("webonly"), advancedFeatureUsage: user.lastLoginDaysAgo != null && user.lastLoginDaysAgo < 30 ? 0.8 : 0.1, activityPresent: (user.lastLoginDaysAgo ?? 999) <= 90, isFrontlineWorker: user.userPrincipalName.includes("frontline"), addonUsageDaysAgo: user.assignedLicenses?.[0]?.startsWith("ADDON_") ? 120 : null };
        const evaluation = playbook.evaluate(mapped);
        const missingSignals = (evaluation.requiredSignals ?? []).filter((signal: string) => {
          if (signal === "assignedLicenses") return (mapped.assignedLicenses?.length ?? 0) === 0;
          if (signal === "userPrincipalName") return !mapped.userPrincipalName;
          if (signal === "accountEnabled") return mapped.accountEnabled == null;
          if (signal === "lastLoginDaysAgo") return user.lastLoginDaysAgo == null;
          if (signal === "mailboxType") return mapped.mailboxType == null;
          if (signal === "advancedFeatureUsage") return mapped.advancedFeatureUsage == null;
          if (signal === "activityPresent") return mapped.activityPresent == null;
          if (signal === "hasDesktopActivity") return mapped.hasDesktopActivity == null;
          if (signal === "isFrontlineWorker") return mapped.isFrontlineWorker == null;
          if (signal === "addonUsageDaysAgo") return mapped.addonUsageDaysAgo == null;
          return false;
        });

        const evaluationEvent = await createPlaybookEvaluationEvent({
          tenantId,
          ingestionRunId: user.ingestionRunId,
          playbookId: playbook.id,
          playbookName: playbook.name,
          candidateType: "USER",
          candidateId: mapped.email,
          candidateDisplayName: mapped.displayName,
          matched: evaluation.matched,
          reason: evaluation.reason,
          recommendedAction: Array.isArray(evaluation.recommendedAction) ? evaluation.recommendedAction.join("+") : evaluation.recommendedAction,
          exclusions: evaluation.exclusions,
          requiredSignals: evaluation.requiredSignals,
          missingSignals,
          evidence: evaluation.evidence,
        });

        const [existing] = await db.select().from(recommendationsTable).where(and(eq(recommendationsTable.userEmail, user.userPrincipalName), eq(recommendationsTable.status, "pending")));

        const shouldCreateRecommendation = latestSync.connectorHealth !== "FAILED" && evaluation.matched && evaluation.exclusions.length === 0 && missingSignals.length === 0 && !existing;
        if (!shouldCreateRecommendation) continue;

        const pricing = await resolveProjectedSavings(tenantId, mapped.sku, 1);
        const reconciliationTrustSignals = await buildTrustSignalsFromFindings(tenantId, user.userPrincipalName);
        const recommendationAction = Array.isArray(evaluation.recommendedAction) ? evaluation.recommendedAction.join("+") : evaluation.recommendedAction;
        const trustContext = buildTrustContext({ userPrincipalName: user.userPrincipalName, lastLoginDaysAgo: user.lastLoginDaysAgo }, latestSync, recommendationAction);
        const trust = assessTrust({ ...trustContext, reconciliationTrustSignals });
        const exEval = await evaluateExceptions({ tenantId, recommendationId: "", targetType: "USER", targetId: user.userPrincipalName, pricingConfidence: pricing.pricingConfidence, trustGate: trust.execution_gate, riskClass: "B", policyDecision: trust.execution_gate === "APPROVAL_REQUIRED" ? "REQUIRE_APPROVAL" : "ALLOW" });
        const [rec] = await db.insert(recommendationsTable).values({
          userEmail: user.userPrincipalName,
          displayName: user.displayName ?? user.userPrincipalName,
          licenceSku: mapped.sku,
          monthlyCost: pricing.projectedMonthlySaving || evaluation.estimatedMonthlySaving,
          annualisedCost: pricing.projectedAnnualSaving || evaluation.estimatedMonthlySaving * 12,
          pricingConfidence: pricing.pricingConfidence,
          pricingSource: pricing.pricingSource,
          trustScore: trust.execution_readiness_score,
          entityTrustScore: trust.entity_trust_score,
          recommendationTrustScore: trust.recommendation_trust_score,
          executionReadinessScore: trust.execution_readiness_score,
          executionStatus: trust.execution_gate,
          criticalBlockers: trust.critical_blockers,
          warnings: pricing.warning ? [...trust.warnings, pricing.warning] : trust.warnings,
          scoreBreakdown: trust.score_breakdown,
          status: exEval.reasons.includes("SUPPRESSED_BY_EXCEPTION") ? "SUPPRESSED" : "pending",
          playbook: playbook.vendor,
          playbookId: playbook.id,
          playbookName: playbook.name,
          playbookEvidence: evaluation.evidence,
          playbookRequiredSignals: evaluation.requiredSignals,
          playbookExclusions: evaluation.exclusions,
          evaluationEventId: String(evaluationEvent.id),
          connector: "m365",
          ingestionRunId: user.ingestionRunId,
          sourceTimestamp: user.sourceTimestamp,
          connectorHealth: latestSync.connectorHealth,
          dataFreshnessScore: latestSync.dataFreshnessScore,
          freshnessBand: latestSync.freshnessBand,
          partialData: latestSync.partialData,
          connectorHealthSnapshot: latestSync,
          lastActivity: user.lastLoginDaysAgo == null ? null : new Date(Date.now() - user.lastLoginDaysAgo * 86400000),
          daysSinceActivity: user.lastLoginDaysAgo,
          rejectionReason: null,
        }).returning();
        generated.push(rec);
      }
    }
    return res.json({ generated: generated.length, recommendations: generated, syncMetadata: latestSync });
  } catch (err) {
    req.log.error({ err }, "Error generating recommendations");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
