import test from "node:test";
import assert from "node:assert/strict";
import { M365EvidenceNormalizationService } from "../lib/connectors/m365/m365-evidence-normalization-service";

test("evidence normalization maps required playbook evidence fields", () => {
  const s = new M365EvidenceNormalizationService();
  const out = s.normalize({ users: [{ id: "1", userPrincipalName: "a@b.com", displayName: "A", accountEnabled: true }], assignedLicences: [{ userPrincipalName: "a@b.com", assignedLicenses: [{ skuId: "E5" }] }], skuData: [], activitySignals: [], mailboxSignals: [], serviceUsageSignals: [] });
  assert.equal(out.length, 1);
  const row = out[0]!;
  for (const k of ["userId","displayName","assignedLicences","monthlyLicenceCost","lastSignInAt","accountStatus","mailboxType","copilotActivity","addOnUsage","desktopAppUsage","evidenceCompleteness","evidenceFreshness","sourceSystem"]) assert.ok(k in row);
});
