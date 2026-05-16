import test from "node:test";
import assert from "node:assert/strict";
import { EvidenceReconciliationService } from "../lib/connectors/m365/evidence-reconciliation-service";

test("missing required evidence creates finding", async () => {
  const svc = new EvidenceReconciliationService();
  const findings = await svc.reconcileM365Evidence("t1", [{ sourceSystem: "M365_GRAPH" }]);
  assert.ok(findings.some((f) => f.findingType === "MISSING_REQUIRED_FIELD"));
});

test("stale evidence creates finding", async () => {
  const svc = new EvidenceReconciliationService();
  const findings = await svc.reconcileM365Evidence("t1", [{ userId: "u1", sourceSystem: "M365_GRAPH", lastSignInAt: "2020-01-01T00:00:00Z" }]);
  assert.ok(findings.some((f) => f.findingType === "STALE_EVIDENCE"));
});
