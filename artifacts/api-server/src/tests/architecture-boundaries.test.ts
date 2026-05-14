import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function text(path: string) {
  return readFileSync(join(process.cwd(), "artifacts/api-server/src/tests", path), "utf8");
}

function assertNoForbiddenImports(filePath: string, forbidden: string[]) {
  const src = text(filePath);
  for (const item of forbidden) {
    assert.equal(src.includes(item), false, `${filePath} must not import ${item}`);
  }
}

test("architecture boundary guards", () => {
  assertNoForbiddenImports("../routes/recommendations.ts", [
    "m365-ingestion",
    "m365-graph-client",
    "m365/m365-graph-client",
    "connectors/m365/m365-graph-client",
    "m365-ingestion",
  ]);

  assertNoForbiddenImports("../lib/playbooks/m365-inactive-user-reclaim.ts", [
    "@workspace/db",
    "schema",
    "connectors/",
    "execution-engine",
    "outcome-ledger",
  ]);

  assertNoForbiddenImports("../lib/trust-engine.ts", [
    "connectors/",
    "../routes/",
    "@workspace/db",
    "execution-engine",
    "reconciliation/trust-signal-adapter",
  ]);

  assertNoForbiddenImports("../lib/execution/execution-engine.ts", [
    "connectors/",
    "playbooks/registry",
    "routes/recommendations",
  ]);

  assertNoForbiddenImports("../lib/outcome-ledger/create-ledger-entry.ts", ["trust-engine"]);
  assertNoForbiddenImports("../lib/jobs/scheduler.ts", [
    "m365-graph-client",
    "trust-engine",
    "execution/m365-graph-actions",
  ]);



  assertNoForbiddenImports("../lib/governance/exceptions.ts", [
    "connectors/",
    "m365-graph-client",
    "outcome-ledger",
  ]);

  assertNoForbiddenImports("../lib/monitoring/drift-monitor.ts", ["outcome-ledger/create-ledger-entry"]);
  assertNoForbiddenImports("../lib/operationalization/app-discovery.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/operationalization/entitlement-ownership.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/operationalization/alias-resolution.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/operationalization/owner-inference.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/operationalization/readiness-blockers.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/operationalization/packs/base-pack.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/operationalization/packs/servicenow-sam-pack.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/operationalization/packs/flexera-value-pack.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/operationalization/packs/pack-runner.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/enterprise/operator-workbench.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/enterprise/evidence-explorer.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/enterprise/executive-dashboard.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/enterprise/connector-operations-console.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/enterprise/value-realization-analytics.ts", ["connectors/","execution-engine","recommendations","outcome-ledger"]);
  assertNoForbiddenImports("../lib/auth/auth-context.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/auth/rbac.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/onboarding/onboarding-state.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/observability/platform-events.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/security/security-controls.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/auth/providers/microsoft-entra.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/auth/providers/jwt-validation.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/auth/providers/session-manager.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/security/tenant-context.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/security/anomaly-detection.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/analytics/operational-maturity.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/analytics/savings-realization.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/analytics/governance-posture.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/analytics/onboarding-velocity.ts", ["connectors/","execution-engine"]);
  assertNoForbiddenImports("../lib/analytics/connector-performance.ts", ["connectors/","execution-engine"]);

});
