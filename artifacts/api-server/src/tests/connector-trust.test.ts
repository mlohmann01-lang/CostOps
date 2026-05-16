import test from "node:test";
import assert from "node:assert/strict";
import { ConnectorTrustService } from "../lib/connectors/m365/connector-trust-service";

test("complete fresh evidence produces HIGH trust", () => {
  const svc = new ConnectorTrustService();
  const trust = svc.evaluateM365EvidenceTrust("t1", [{ userId: "u1", evidenceFreshness: 1, evidenceCompleteness: 1 }], []);
  assert.equal(trust.trustBand, "HIGH");
});

test("critical finding quarantines connector trust", () => {
  const svc = new ConnectorTrustService();
  const trust = svc.evaluateM365EvidenceTrust("t1", [{ userId: "u1", evidenceFreshness: 1, evidenceCompleteness: 1 }], [{ severity: "CRITICAL", findingType: "MAILBOX_TYPE_CONFLICT" }]);
  assert.equal(trust.trustBand, "QUARANTINED");
});
