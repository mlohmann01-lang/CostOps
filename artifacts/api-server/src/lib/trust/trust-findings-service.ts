import type { ConnectorRuntimeSignal, TrustFinding, TrustFindingType, TrustRecommendation } from "./trust-types";

function annualValue(rec?: TrustRecommendation): number {
  if (!rec) return 0;
  if (typeof rec.projectedAnnualSavings === "number" && Number.isFinite(rec.projectedAnnualSavings)) return Math.max(0, rec.projectedAnnualSavings);
  if (typeof rec.projectedMonthlySavings === "number" && Number.isFinite(rec.projectedMonthlySavings)) return Math.max(0, rec.projectedMonthlySavings * 12);
  return 0;
}

function findingTypeForReason(reason: string): TrustFindingType | null {
  const upper = reason.toUpperCase();
  if (upper.includes("IDENTITY")) return "IDENTITY_CONFLICT";
  if (upper.includes("OWNER") || upper.includes("OWNERSHIP")) return "MISSING_OWNER";
  if (upper.includes("STALE") || upper.includes("FRESH")) return "STALE_SOURCE";
  if (upper.includes("USAGE")) return "MISSING_USAGE_EVIDENCE";
  if (upper.includes("ENTITLEMENT")) return "ENTITLEMENT_CONFLICT";
  if (upper.includes("COST_CENTRE") || upper.includes("COST_CENTER")) return "UNKNOWN_COST_CENTRE";
  if (upper.includes("POLICY")) return "POLICY_BLOCKED";
  if (upper.includes("TRUST") || upper.includes("EVIDENCE")) return "MISSING_USAGE_EVIDENCE";
  return null;
}

function remediationHint(type: TrustFindingType) {
  switch (type) {
    case "IDENTITY_CONFLICT": return "Resolve identity mapping before approving execution.";
    case "MISSING_OWNER": return "Assign a business owner or cost owner to the affected entity.";
    case "STALE_SOURCE": return "Refresh the connector and confirm source freshness.";
    case "CONNECTOR_DEGRADED": return "Review connector health, credentials, and latest sync errors.";
    case "MISSING_USAGE_EVIDENCE": return "Sync usage evidence required by the playbook.";
    case "ENTITLEMENT_CONFLICT": return "Reconcile entitlement records across source systems.";
    case "UNKNOWN_COST_CENTRE": return "Map the entity to a known cost centre.";
    case "POLICY_BLOCKED": return "Review governance policy requirements or request an exception.";
  }
}

function description(type: TrustFindingType, source: string) {
  switch (type) {
    case "IDENTITY_CONFLICT": return `Identity evidence conflict detected in ${source}.`;
    case "MISSING_OWNER": return `Ownership metadata is missing in ${source}.`;
    case "STALE_SOURCE": return `${source} data is stale or freshness evidence is incomplete.`;
    case "CONNECTOR_DEGRADED": return `${source} connector is degraded.`;
    case "MISSING_USAGE_EVIDENCE": return `Usage evidence is missing for ${source}.`;
    case "ENTITLEMENT_CONFLICT": return `Entitlement evidence conflicts in ${source}.`;
    case "UNKNOWN_COST_CENTRE": return `Cost centre mapping is unknown in ${source}.`;
    case "POLICY_BLOCKED": return `Governance policy blocks execution for ${source}.`;
  }
}

export function generateTrustFindings(input: { tenantId: string; recommendations: TrustRecommendation[]; connectors?: ConnectorRuntimeSignal[]; now?: Date }): TrustFinding[] {
  const now = input.now ?? new Date();
  const findings: TrustFinding[] = [];
  for (const rec of input.recommendations.filter((item) => item.tenantId === input.tenantId)) {
    const reasons = Array.from(new Set([...(rec.blockedReasons ?? []), ...(rec.readinessReasons ?? [])]));
    for (const reason of reasons) {
      const type = findingTypeForReason(reason);
      if (!type) continue;
      const source = rec.sourceSystem ?? rec.connector ?? "UNKNOWN";
      findings.push({
        findingId: `trust:${input.tenantId}:${rec.recommendationId}:${type}`,
        tenantId: input.tenantId,
        findingType: type,
        severity: type === "IDENTITY_CONFLICT" || type === "POLICY_BLOCKED" ? "HIGH" : "MEDIUM",
        entityType: "RECOMMENDATION",
        entityId: rec.targetEntityId ?? rec.recommendationId,
        sourceSystem: source,
        description: description(type, source),
        affectedRecommendationIds: [rec.recommendationId],
        affectedValue: annualValue(rec),
        status: "OPEN",
        remediationHint: remediationHint(type),
        detectedAt: now.toISOString(),
      });
    }
  }

  for (const connector of input.connectors ?? []) {
    const status = connector.status.toUpperCase();
    if (!status.includes("DEGRADED") && !status.includes("FAILED") && !status.includes("UNAVAILABLE")) continue;
    findings.push({
      findingId: `trust:${input.tenantId}:${connector.connectorId}:CONNECTOR_DEGRADED`,
      tenantId: input.tenantId,
      findingType: "CONNECTOR_DEGRADED",
      severity: status.includes("FAILED") || status.includes("UNAVAILABLE") ? "HIGH" : "MEDIUM",
      entityType: "CONNECTOR",
      entityId: connector.connectorId,
      sourceSystem: connector.platform,
      description: description("CONNECTOR_DEGRADED", connector.connectorName),
      affectedRecommendationIds: input.recommendations.filter((rec) => (rec.connector ?? rec.sourceSystem ?? "").toLowerCase() === connector.platform.toLowerCase()).map((rec) => rec.recommendationId),
      affectedValue: input.recommendations.filter((rec) => (rec.connector ?? rec.sourceSystem ?? "").toLowerCase() === connector.platform.toLowerCase()).reduce((sum, rec) => sum + annualValue(rec), 0),
      status: "OPEN",
      remediationHint: remediationHint("CONNECTOR_DEGRADED"),
      detectedAt: now.toISOString(),
    });
  }
  return findings;
}
