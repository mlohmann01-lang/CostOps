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
});
