import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { VendorChangeRepository } from "../lib/vcde/vendor-change-repository";

test("detects seeded vendor changes", () => {
  const repo = new VendorChangeRepository();
  repo.clearForTests();
  const rows = repo.list("tenant-a");
  assert.ok(rows.length >= 3);
  assert.ok(rows.some((row) => row.vendor === "MICROSOFT" && row.title.includes("Copilot")));
});

test("high impact filters critical and high changes", () => {
  const repo = new VendorChangeRepository();
  repo.clearForTests();
  const high = repo.highImpact("tenant-a");
  assert.ok(high.every((row) => ["HIGH", "CRITICAL"].includes(row.impactSeverity)));
});

test("tenant isolation", () => {
  const repo = new VendorChangeRepository();
  repo.clearForTests();
  repo.upsert("tenant-a", { id: "custom-a", vendor: "AWS", category: "PRICE_CHANGE", title: "A", description: "A", effectiveDate: "2026-06-01", sourceUrl: "https://aws.amazon.com", impactSeverity: "LOW", detectedAt: "2026-05-30T00:00:00.000Z" });
  assert.equal(repo.get("tenant-b", "custom-a"), null);
});

test("no execution mutation", async () => {
  const body = await readFile("src/lib/vcde/vendor-change-repository.ts", "utf8");
  assert.equal(/executionRequestsTable|executionResultsTable|\.delete\(|removeUserLicenses|assignLicense/.test(body), false);
});
