import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildOpportunities } from "../lib/opportunities/opportunity-factory";
import type { TrustFinding } from "../lib/trust/trust-types";
import type { StoredVendorChangeEvent } from "../lib/vcde/vendor-change-types";

const finding: TrustFinding = { findingId: "tf-1", tenantId: "tenant-a", findingType: "IDENTITY_CONFLICT", severity: "HIGH", entityType: "USER", entityId: "u1", sourceSystem: "M365", description: "Identity conflict blocks reclaim", affectedRecommendationIds: ["rec-1"], affectedValue: 12000, status: "OPEN", remediationHint: "Resolve identity", detectedAt: "2026-05-30T00:00:00.000Z" };
const change: StoredVendorChangeEvent = { id: "vc-1", tenantId: "tenant-a", vendor: "MICROSOFT", category: "LICENSING_CHANGE", title: "Copilot price increase", description: "Copilot pricing changed", effectiveDate: "2026-07-01", sourceUrl: "https://microsoft.com", impactSeverity: "HIGH", detectedAt: "2026-05-30T00:00:00.000Z", status: "NEW", affectedSpend: 32000, generatedOpportunityCount: 6 };
const drift = { id: "drift-1", tenantId: "tenant-a", title: "License reassignment", domain: "M365", affectedValue: 3600, severity: "MEDIUM", detectedAt: "2026-05-30T00:00:00.000Z" };

test("normalizes trust findings, vendor changes, and drift into canonical opportunities", () => {
  const rows = buildOpportunities({ trustFindings: [finding], vendorChanges: [change], driftAlerts: [drift] });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.source), ["TRUST", "VENDOR_CHANGE", "DRIFT"]);
  assert.ok(rows.every((row) => row.tenantId === "tenant-a"));
});

test("trust findings become blocked opportunities with source reference", () => {
  const [row] = buildOpportunities({ trustFindings: [finding] });
  assert.equal(row.readiness, "BLOCKED");
  assert.equal(row.sourceReferenceId, "tf-1");
  assert.equal(row.domain, "M365");
});

test("no execution mutation", async () => {
  const files = ["src/lib/opportunities/opportunity-factory.ts", "src/lib/opportunities/opportunity-normalizer.ts"];
  for (const file of files) {
    const body = await readFile(file, "utf8");
    assert.equal(/executionRequestsTable|executionResultsTable|\.delete\(|removeUserLicenses|assignLicense|approveRecommendation/.test(body), false);
  }
});
