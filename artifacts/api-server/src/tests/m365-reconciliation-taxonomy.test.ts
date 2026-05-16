import test from "node:test";
import assert from "node:assert/strict";
import { EvidenceReconciliationService } from "../lib/connectors/m365/evidence-reconciliation-service";

test("reconciliation creates M365 taxonomy findings", async () => {
  const svc = new EvidenceReconciliationService();
  const findings = await svc.reconcileM365Evidence("t1", [{ userId: "1", userPrincipalName: "u@a", sourceSystem: "M365_GRAPH", copilotUsage: "UNKNOWN", desktopAppUsage: "UNKNOWN", webUsage: "UNKNOWN", mailboxStorageBytes: "UNKNOWN", oneDriveStorageBytes: "UNKNOWN", sharePointStorageBytes: "UNKNOWN", isSharedMailbox: "UNKNOWN", isServiceAccount: "UNKNOWN", retentionPolicy: "UNKNOWN", legalHold: true, evidenceFreshness: "EXPIRED", pricingConfidence: 0.1 }]);
  const types = findings.map((f: any) => f.findingType);
  assert.ok(types.includes("M365_COPILOT_USAGE_UNAVAILABLE"));
  assert.ok(types.includes("M365_LEGAL_HOLD_BLOCKER"));
  assert.ok(types.includes("M365_USAGE_DATA_STALE"));
});
