import test from "node:test";
import assert from "node:assert/strict";
import { ConnectorTrustService } from "../lib/connectors/m365/connector-trust-service";

test("trust scoring degrades with UNKNOWN/stale evidence", () => {
  const svc = new ConnectorTrustService();
  const out = svc.evaluateM365EvidenceTrust("t1", [{ userId: "1", userPrincipalName: "a", assignedSkuIds: ["E5"], copilotUsage: "UNKNOWN", desktopAppUsage: "UNKNOWN", legalHold: "UNKNOWN", evidenceFreshness: "STALE", pricingConfidence: 0.4 }], []);
  assert.ok(out.dimensionScores.usageTrust < 60);
  assert.ok(out.dimensionScores.connectorFreshnessTrust < 80);
  assert.ok(["LOW","MEDIUM","HIGH","QUARANTINED"].includes(out.trustBand));
});
