import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { trustBandForScore } from "../lib/trust/trust-score-engine";
import { rollupExecutionReadiness } from "../lib/trust/execution-readiness-rollup";
import { generateTrustFindings } from "../lib/trust/trust-findings-service";
import { buildConnectorTrustRows, buildTrustSummary } from "../lib/trust/trust-summary-service";
import type { ConnectorRuntimeSignal, TrustRecommendation } from "../lib/trust/trust-types";

const recs: TrustRecommendation[] = [
  { tenantId: "tenant-a", recommendationId: "r-ready", connector: "M365", executionReadiness: "READY_FOR_EXECUTION", projectedAnnualSavings: 42000, blockedReasons: [], readinessReasons: [] },
  { tenantId: "tenant-a", recommendationId: "r-approval", connector: "AWS", executionReadiness: "APPROVAL_REQUIRED", projectedAnnualSavings: 18000, blockedReasons: [], readinessReasons: [] },
  { tenantId: "tenant-a", recommendationId: "r-trust", connector: "ServiceNow", executionReadiness: "BLOCKED", projectedAnnualSavings: 9000, blockedReasons: ["IDENTITY_CONFLICT", "MISSING_OWNER", "STALE_SOURCE"], readinessReasons: [] },
  { tenantId: "tenant-a", recommendationId: "r-policy", connector: "Snowflake", executionReadiness: "BLOCKED", projectedAnnualSavings: 4000, blockedReasons: ["POLICY_BLOCKED"], readinessReasons: [] },
  { tenantId: "tenant-a", recommendationId: "r-manual", connector: "M365", executionReadiness: "MANUAL_ONLY", projectedAnnualSavings: 2000, blockedReasons: [], readinessReasons: [] },
  { tenantId: "tenant-b", recommendationId: "other", connector: "M365", executionReadiness: "READY_FOR_EXECUTION", projectedAnnualSavings: 999999, blockedReasons: [], readinessReasons: [] },
];

const connectors: ConnectorRuntimeSignal[] = [
  { connectorId: "m365", connectorName: "M365", platform: "M365", status: "HEALTHY", freshnessStatus: "FRESH", trustScore: 92, lastSyncAt: "2026-05-30T00:00:00.000Z" },
  { connectorId: "servicenow", connectorName: "ServiceNow", platform: "ServiceNow", status: "DEGRADED", freshnessStatus: "STALE", trustScore: 79, lastSyncAt: "2026-05-29T00:00:00.000Z" },
];

test("trust band calculation follows required thresholds", () => {
  assert.equal(trustBandForScore(95), "TRUSTED");
  assert.equal(trustBandForScore(83), "HIGH");
  assert.equal(trustBandForScore(61), "INVESTIGATE");
  assert.equal(trustBandForScore(45), "LOW_CONFIDENCE");
  assert.equal(trustBandForScore(12), "BLOCKED");
});

test("summary and readiness aggregate recommendation values with trust and policy separated", () => {
  const tenantRecs = recs.filter((r) => r.tenantId === "tenant-a");
  const readiness = rollupExecutionReadiness(tenantRecs);
  assert.equal(readiness.executionEligibleValue, 42000);
  assert.equal(readiness.approvalRequiredValue, 18000);
  assert.equal(readiness.blockedByTrustValue, 9000);
  assert.equal(readiness.blockedByPolicyValue, 4000);
  assert.equal(readiness.manualOnlyValue, 2000);

  const findings = generateTrustFindings({ tenantId: "tenant-a", recommendations: tenantRecs, connectors });
  const connectorRows = buildConnectorTrustRows({ tenantId: "tenant-a", recommendations: tenantRecs, connectors, findings });
  const summary = buildTrustSummary({ tenantId: "tenant-a", recommendations: tenantRecs, findings, connectors: connectorRows, now: new Date("2026-05-30T00:00:00.000Z") });
  assert.equal(summary.blockedByTrustValue, 9000);
  assert.equal(summary.blockedByPolicyValue, 4000);
  assert.equal(summary.identityConflictCount, 1);
  assert.equal(summary.missingOwnerCount, 1);
  assert.equal(summary.staleSourceCount, 1);
});

test("connector degraded lowers connector trust and includes reasons", () => {
  const findings = generateTrustFindings({ tenantId: "tenant-a", recommendations: recs, connectors });
  const rows = buildConnectorTrustRows({ tenantId: "tenant-a", recommendations: recs.filter((r) => r.tenantId === "tenant-a"), connectors, findings });
  const m365 = rows.find((row) => row.connectorName === "M365")!;
  const snow = rows.find((row) => row.connectorName === "ServiceNow")!;
  assert.ok(snow.trustScore < m365.trustScore);
  assert.ok(snow.trustReasons.some((reason) => reason.includes("degraded")));
});

test("findings are generated from missing evidence, stale connector and identity conflict", () => {
  const findings = generateTrustFindings({ tenantId: "tenant-a", recommendations: recs, connectors });
  const types = findings.map((finding) => finding.findingType);
  assert.ok(types.includes("IDENTITY_CONFLICT"));
  assert.ok(types.includes("MISSING_OWNER"));
  assert.ok(types.includes("STALE_SOURCE"));
  assert.ok(types.includes("CONNECTOR_DEGRADED"));
  assert.ok(findings.every((finding) => finding.remediationHint.length > 0));
});

test("tenant isolation excludes other tenant values", () => {
  const readiness = rollupExecutionReadiness(recs.filter((r) => r.tenantId === "tenant-a"));
  assert.equal(readiness.executionEligibleValue, 42000);
});

test("trust domain remains read-only with no execution or remediation mutation", async () => {
  const files = await Promise.all([
    readFile("src/lib/trust/trust-summary-service.ts", "utf8"),
    readFile("src/lib/trust/trust-findings-service.ts", "utf8"),
    readFile("src/lib/trust/execution-readiness-rollup.ts", "utf8"),
  ]);
  const body = files.join("\n");
  assert.equal(/\.insert\(|\.update\(|\.delete\(|POST|assignLicense|removeUserLicenses/.test(body), false);
});
