import test from "node:test";
import assert from "node:assert/strict";
import { M365EvidenceNormalizationService, UNKNOWN } from "../lib/connectors/m365/m365-evidence-normalization-service";

test("evidence normalization maps deterministic expanded fields with UNKNOWN", () => {
  const s = new M365EvidenceNormalizationService();
  const out = s.normalize({ tenantId: "t1", users: [{ id: "1", userPrincipalName: "a@b.com", displayName: "A", accountEnabled: true }], assignedLicences: [{ userPrincipalName: "a@b.com", assignedLicenses: [{ skuId: "E5" }] }], skuData: [], activitySignals: [], mailboxSignals: [], serviceUsageSignals: [] });
  assert.equal(out.length, 1);
  const row = out[0]!;
  assert.equal(row.tenantId, "t1");
  assert.equal(row.userPrincipalName, "a@b.com");
  assert.equal(row.copilotUsage, UNKNOWN);
  assert.equal(row.legalHold, UNKNOWN);
  assert.equal(row.retentionPolicy, UNKNOWN);
  assert.ok(["FRESH", "STALE", "EXPIRED", "UNKNOWN"].includes(row.evidenceFreshness));
});
