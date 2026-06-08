import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  demoEconomicOutcomeData,
  economicOutcomeApiPaths,
  normalizeEconomicOutcomePayload,
} from "../hooks/useEconomicOutcomeData";

test("Economic Outcome Dashboard route exists", () => {
  const app = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  assert.equal(
    /import EconomicOutcomeDashboard from ['"]\.\/pages\/EconomicOutcomeDashboard['"]/.test(app),
    true,
  );
  assert.equal(app.includes("/economic-outcomes"), true);
  assert.equal(app.includes("EconomicOutcomeDashboardRoute"), true);
});

test("dashboard renders required economic outcome totals and sections", () => {
  const page = fs.readFileSync(
    new URL("../pages/EconomicOutcomeDashboard.tsx", import.meta.url),
    "utf8",
  );
  for (const text of [
    "Economic Outcome Dashboard",
    "Total Outcomes",
    "Measured Outcomes",
    "Unproven Outcomes",
    "Total Attributed Value",
    "Total Attributed Cost",
    "Net Value",
    "Assets With Insufficient Evidence",
    "Keep / Optimise / Expand / Retire Counts",
    "Top Value-Producing Assets",
    "High-Cost Low-Value Assets",
    "Recent Economic Decisions",
  ])
    assert.equal(page.includes(text), true);
});

test("asset outcome summary renders decision confidence value cost and ratio fields", () => {
  const page = fs.readFileSync(
    new URL("../pages/EconomicOutcomeDashboard.tsx", import.meta.url),
    "utf8",
  );
  for (const text of [
    "Asset Outcome Summary",
    "Asset Name",
    "Asset Type",
    "Owner",
    "Spend",
    "Usage",
    "Measured Value",
    "Value-to-Cost Ratio",
    "Decision",
    "Confidence",
    "Evidence Count",
  ])
    assert.equal(page.includes(text), true);
});

test("demo fallback works when API is unavailable", () => {
  assert.deepEqual(economicOutcomeApiPaths, [
    "/api/economic-outcomes/dashboard",
  ]);
  const fallback = normalizeEconomicOutcomePayload({});
  assert.equal(
    fallback.summary.totalOutcomes,
    demoEconomicOutcomeData.summary.totalOutcomes,
  );
  assert.equal(fallback.assetSummaries[0].decision, "EXPAND");
  assert.equal(fallback.assetSummaries[0].confidence, "HIGH");
  assert.equal(fallback.assetSummaries[0].valueToCostRatio, 3);
  const normalized = normalizeEconomicOutcomePayload({
    summary: { totalOutcomes: 9 },
    assetSummaries: [
      {
        assetId: "asset-1",
        asset: { name: "Measured Asset", assetType: "AI_ASSET" },
        decision: "KEEP",
        confidence: "MEDIUM",
        measuredValue: 1000,
        spend: 500,
        valueToCostRatio: 2,
      },
    ],
  });
  assert.equal(normalized.summary.totalOutcomes, 9);
  assert.equal(normalized.assetSummaries[0].decision, "KEEP");
});
