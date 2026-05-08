import { Router } from "express";
import { db } from "@workspace/db";
import { connectorSyncStatusTable, recommendationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { assessTrust } from "../lib/trust-engine";
import { PLAYBOOK_REGISTRY } from "../lib/playbooks/registry";
import { ingestM365Tenant } from "../lib/connectors/m365-ingestion";
import { reliabilityFromHealth } from "../lib/connectors/connector-health";
import { createPlaybookEvaluationEvent } from "../lib/playbooks/evaluation-log";

const router = Router();
const MVP_MODE = true;

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

router.get("/", async (req, res) => {
  const rows = await db.select().from(recommendationsTable).orderBy(recommendationsTable.createdAt);
  res.json(rows);
});

router.post("/generate", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const ingestion = await ingestM365Tenant(tenantId);

    await db.insert(connectorSyncStatusTable).values({
      tenantId,
      connector: ingestion.metadata.connector,
      lastSyncTime: new Date(ingestion.metadata.lastSyncTime),
      connectorHealth: ingestion.metadata.connectorHealth,
      dataFreshnessScore: ingestion.metadata.dataFreshnessScore,
      freshnessBand: ingestion.metadata.freshnessBand,
      partialData: String(ingestion.metadata.partialData),
      errorCode: ingestion.metadata.errorCode ?? null,
      errorMessage: ingestion.metadata.errorMessage ?? null,
      requestId: ingestion.metadata.requestId,
    });

    const generated = [];
    for (const user of ingestion.users) {
      for (const playbook of PLAYBOOK_REGISTRY) {
        const mapped = { email: user.userPrincipalName, displayName: user.displayName ?? user.userPrincipalName, sku: user.assignedLicenses[0] ?? "UNKNOWN", cost: 57, days: user.lastLoginDaysAgo ?? 999, accountEnabled: user.accountEnabled, assignedLicenses: user.assignedLicenses, userPrincipalName: user.userPrincipalName, mailboxType: "user" };
        const evaluation = playbook.evaluate(mapped);
        const missingSignals = (evaluation.requiredSignals ?? []).filter((signal: string) => {
          if (signal === "assignedLicenses") return (mapped.assignedLicenses?.length ?? 0) === 0;
          if (signal === "userPrincipalName") return !mapped.userPrincipalName;
          if (signal === "accountEnabled") return mapped.accountEnabled == null;
          if (signal === "lastLoginDaysAgo") return user.lastLoginDaysAgo == null;
          return false;
        });

        const evaluationEvent = await createPlaybookEvaluationEvent({
          tenantId,
          ingestionRunId: ingestion.ingestionRunId,
          playbookId: playbook.id,
          playbookName: playbook.name,
          candidateType: "USER",
          candidateId: mapped.email,
          candidateDisplayName: mapped.displayName,
          matched: evaluation.matched,
          reason: evaluation.reason,
          recommendedAction: evaluation.recommendedAction,
          exclusions: evaluation.exclusions,
          requiredSignals: evaluation.requiredSignals,
          missingSignals,
          evidence: evaluation.evidence,
        });

        const [existing] = await db.select().from(recommendationsTable).where(and(eq(recommendationsTable.userEmail, user.userPrincipalName), eq(recommendationsTable.status, "pending")));

        const shouldCreateRecommendation = evaluation.matched && evaluation.exclusions.length === 0 && missingSignals.length === 0 && !existing;
        if (!shouldCreateRecommendation) {
          continue;
        }

        const trust = assessTrust(buildTrustContext(user, ingestion.metadata, evaluation.recommendedAction));
        const [rec] = await db.insert(recommendationsTable).values({
          userEmail: user.userPrincipalName,
          displayName: user.displayName ?? user.userPrincipalName,
          licenceSku: mapped.sku,
          monthlyCost: evaluation.estimatedMonthlySaving,
          annualisedCost: evaluation.estimatedMonthlySaving * 12,
          trustScore: trust.execution_readiness_score,
          entityTrustScore: trust.entity_trust_score,
          recommendationTrustScore: trust.recommendation_trust_score,
          executionReadinessScore: trust.execution_readiness_score,
          executionStatus: trust.execution_gate,
          criticalBlockers: trust.critical_blockers,
          warnings: trust.warnings,
          scoreBreakdown: trust.score_breakdown,
          status: "pending",
          playbook: playbook.vendor,
          playbookId: playbook.id,
          playbookName: playbook.name,
          playbookEvidence: evaluation.evidence,
          playbookRequiredSignals: evaluation.requiredSignals,
          playbookExclusions: evaluation.exclusions,
          evaluationEventId: String(evaluationEvent.id),
          connector: "m365",
          ingestionRunId: ingestion.ingestionRunId,
          sourceTimestamp: new Date(user.sourceTimestamp),
          connectorHealth: ingestion.metadata.connectorHealth,
          dataFreshnessScore: ingestion.metadata.dataFreshnessScore,
          freshnessBand: ingestion.metadata.freshnessBand,
          partialData: String(ingestion.metadata.partialData),
          connectorHealthSnapshot: ingestion.metadata,
          lastActivity: user.lastLoginDaysAgo == null ? null : new Date(Date.now() - user.lastLoginDaysAgo * 86400000),
          daysSinceActivity: user.lastLoginDaysAgo,
          rejectionReason: null,
        }).returning();
        generated.push(rec);
      }
    }
    res.json({ generated: generated.length, recommendations: generated, ingestionMetadata: ingestion.metadata, warnings: ingestion.warnings });
  } catch (err) {
    req.log.error({ err }, "Error generating recommendations");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
