import type { ConnectorRuntimeSignal, ConnectorTrustRow, TrustFinding, TrustRecommendation, TrustSummary } from "./trust-types";
import { buildTrustScore } from "./trust-score-engine";
import { rollupExecutionReadiness } from "./execution-readiness-rollup";
import { classifyExecutionReadiness } from "./execution-readiness-rollup";

function annualValue(rec: TrustRecommendation): number {
  if (typeof rec.projectedAnnualSavings === "number" && Number.isFinite(rec.projectedAnnualSavings)) return Math.max(0, rec.projectedAnnualSavings);
  if (typeof rec.projectedMonthlySavings === "number" && Number.isFinite(rec.projectedMonthlySavings)) return Math.max(0, rec.projectedMonthlySavings * 12);
  return 0;
}

function normalizeConnectorId(value?: string | null) {
  return (value || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

export function buildConnectorTrustRows(input: { tenantId: string; recommendations: TrustRecommendation[]; connectors?: ConnectorRuntimeSignal[]; findings: TrustFinding[] }): ConnectorTrustRow[] {
  const connectorMap = new Map<string, ConnectorRuntimeSignal>();
  for (const c of input.connectors ?? []) connectorMap.set(normalizeConnectorId(c.platform || c.connectorId), c);
  for (const rec of input.recommendations.filter((item) => item.tenantId === input.tenantId)) {
    const platform = rec.connector ?? rec.sourceSystem ?? "UNKNOWN";
    const id = normalizeConnectorId(platform);
    if (!connectorMap.has(id)) connectorMap.set(id, { connectorId: id, connectorName: platform.toUpperCase(), platform, status: "UNKNOWN", freshnessStatus: "UNKNOWN", trustReasons: ["Runtime connector metadata incomplete; trust degraded safely."] });
  }

  return Array.from(connectorMap.values()).map((connector) => {
    const id = normalizeConnectorId(connector.platform || connector.connectorId);
    const relatedRecs = input.recommendations.filter((rec) => normalizeConnectorId(rec.connector ?? rec.sourceSystem ?? "unknown") === id);
    const relatedFindings = input.findings.filter((finding) => normalizeConnectorId(finding.sourceSystem) === id || finding.entityId === connector.connectorId);
    const trustBlocked = relatedRecs.filter((rec) => classifyExecutionReadiness(rec) === "BLOCKED_BY_TRUST");
    const degraded = /DEGRADED|FAILED|UNAVAILABLE/i.test(connector.status);
    const missingRuntime = connector.status === "UNKNOWN" || connector.freshnessStatus === "UNKNOWN";
    const staleCount = relatedFindings.filter((f) => f.findingType === "STALE_SOURCE").length;
    const identityIssues = relatedFindings.filter((f) => f.findingType === "IDENTITY_CONFLICT").length;
    const missingOwnership = relatedFindings.filter((f) => f.findingType === "MISSING_OWNER").length;
    const base = typeof connector.trustScore === "number" ? (connector.trustScore <= 1 ? connector.trustScore * 100 : connector.trustScore) : missingRuntime ? 62 : 84;
    const score = buildTrustScore({
      score: Math.max(0, base - (degraded ? 18 : 0) - trustBlocked.length * 4 - staleCount * 3 - identityIssues * 5 - missingOwnership * 3),
      reasons: [
        ...(connector.trustReasons ?? []),
        degraded ? "Connector health is degraded and lowers execution trust." : "Connector health available for trust scoring.",
        missingRuntime ? "Runtime connector metadata incomplete; returning investigation-grade trust." : "Freshness and connector metadata included.",
        trustBlocked.length > 0 ? `${trustBlocked.length} recommendations blocked by trust evidence.` : "No trust-blocked recommendations for this connector.",
      ],
    });
    return {
      connectorId: connector.connectorId || id,
      connectorName: connector.connectorName || connector.platform || id,
      platform: connector.platform || connector.connectorName || id,
      trustScore: score.score,
      trustBand: score.band,
      trustLabel: score.label,
      trustReasons: score.reasons,
      status: connector.status,
      lastSyncAt: connector.lastSyncAt ?? null,
      freshnessStatus: connector.freshnessStatus ?? "UNKNOWN",
      identityIssues,
      missingOwnership,
      staleRecords: staleCount,
      blockedRecommendationCount: trustBlocked.length,
      affectedValue: relatedRecs.reduce((sum, rec) => sum + annualValue(rec), 0),
    };
  });
}

export function buildTrustSummary(input: { tenantId: string; recommendations: TrustRecommendation[]; findings: TrustFinding[]; connectors: ConnectorTrustRow[]; now?: Date }): TrustSummary {
  const tenantRecommendations = input.recommendations.filter((rec) => rec.tenantId === input.tenantId);
  const rollup = rollupExecutionReadiness(tenantRecommendations);
  const openFindings = input.findings.filter((finding) => finding.tenantId === input.tenantId && finding.status === "OPEN");
  const connectorAverage = input.connectors.length > 0 ? input.connectors.reduce((sum, row) => sum + row.trustScore, 0) / input.connectors.length : 60;
  const trustPenalty = Math.min(25, openFindings.length * 1.5 + tenantRecommendations.filter((rec) => classifyExecutionReadiness(rec) === "BLOCKED_BY_TRUST").length * 2);
  const trust = buildTrustScore({
    score: connectorAverage - trustPenalty,
    reasons: [
      input.connectors.length > 0 ? `${input.connectors.length} connector trust signals included.` : "No connector trust signals available; trust requires investigation.",
      openFindings.length > 0 ? `${openFindings.length} open trust findings affect readiness.` : "No open trust findings detected.",
      rollup.blockedByTrustValue > 0 ? `$${Math.round(rollup.blockedByTrustValue).toLocaleString()} blocked by trust issues.` : "No value currently blocked by trust issues.",
    ],
  });
  return {
    tenantId: input.tenantId,
    globalTrustScore: trust.score,
    globalTrustBand: trust.band,
    globalTrustLabel: trust.label,
    globalTrustReasons: trust.reasons,
    ...rollup,
    trustIssueCount: openFindings.length,
    identityConflictCount: openFindings.filter((f) => f.findingType === "IDENTITY_CONFLICT").length,
    missingOwnerCount: openFindings.filter((f) => f.findingType === "MISSING_OWNER").length,
    staleSourceCount: openFindings.filter((f) => f.findingType === "STALE_SOURCE").length,
    connectorDegradedCount: openFindings.filter((f) => f.findingType === "CONNECTOR_DEGRADED").length,
    generatedAt: (input.now ?? new Date()).toISOString(),
  };
}
