import { useEffect, useState } from "react";
import { liveFetch, normalizeApiError } from "../lib/liveApi";

export const economicOutcomeApiPaths = [
  "/api/economic-outcomes/dashboard",
] as const;

export const demoEconomicOutcomeData = {
  tenantId: "demo-tenant",
  summary: {
    totalOutcomes: 4,
    measuredOutcomes: 2,
    unprovenOutcomes: 1,
    totalAttributedValue: 154000,
    totalAttributedCost: 62000,
    netValue: 92000,
    assetsWithInsufficientEvidence: 1,
    keepCount: 1,
    optimiseCount: 1,
    expandCount: 1,
    retireCount: 1,
  },
  assetSummaries: [
    {
      tenantId: "demo-tenant",
      assetId: "aiasset-gpt4o-support",
      asset: {
        id: "aiasset-gpt4o-support",
        name: "GPT-4o Support Model",
        assetType: "AI_ASSET",
        ownerId: "support-owner",
      },
      owner: "support-owner",
      usageCount: 4200,
      spend: 12000,
      measuredValue: 36000,
      netValue: 24000,
      valueToCostRatio: 3,
      decision: "EXPAND",
      confidence: "HIGH",
      evidenceCount: 4,
    },
    {
      tenantId: "demo-tenant",
      assetId: "aiasset-proposal-workflow",
      asset: {
        id: "aiasset-proposal-workflow",
        name: "Sales Proposal Workflow",
        assetType: "AI_ASSET",
        ownerId: "sales-ops",
      },
      owner: "sales-ops",
      usageCount: 20,
      spend: 18000,
      measuredValue: 6000,
      netValue: -12000,
      valueToCostRatio: 0.33,
      decision: "OPTIMISE",
      confidence: "MEDIUM",
      evidenceCount: 2,
    },
  ],
  topValueProducingAssets: [
    {
      assetId: "aiasset-gpt4o-support",
      asset: { name: "GPT-4o Support Model", assetType: "AI_ASSET" },
      measuredValue: 36000,
      spend: 12000,
      netValue: 24000,
      valueToCostRatio: 3,
      decision: "EXPAND",
      confidence: "HIGH",
      evidenceCount: 4,
    },
  ],
  highCostLowValueAssets: [
    {
      assetId: "aiasset-proposal-workflow",
      asset: { name: "Sales Proposal Workflow", assetType: "AI_ASSET" },
      measuredValue: 6000,
      spend: 18000,
      netValue: -12000,
      valueToCostRatio: 0.33,
      decision: "OPTIMISE",
      confidence: "MEDIUM",
      evidenceCount: 2,
    },
  ],
  recentEconomicDecisions: [
    {
      id: "decision-expand-support",
      assetId: "aiasset-gpt4o-support",
      decision: "EXPAND",
      confidence: "HIGH",
      reason: "Value-to-cost ratio is at least 2.0 with sufficient confidence",
    },
    {
      id: "decision-optimise-sales",
      assetId: "aiasset-proposal-workflow",
      decision: "OPTIMISE",
      confidence: "MEDIUM",
      reason: "Positive value exists but is below cost",
    },
  ],
  outcomes: [],
  valueSignals: [],
};

export function normalizeEconomicOutcomePayload(payload: any = {}) {
  const dashboard = payload.dashboard ?? payload;
  return {
    ...demoEconomicOutcomeData,
    ...dashboard,
    summary: {
      ...demoEconomicOutcomeData.summary,
      ...(dashboard.summary ?? {}),
    },
    assetSummaries:
      Array.isArray(dashboard.assetSummaries) && dashboard.assetSummaries.length
        ? dashboard.assetSummaries
        : demoEconomicOutcomeData.assetSummaries,
    topValueProducingAssets:
      Array.isArray(dashboard.topValueProducingAssets) &&
      dashboard.topValueProducingAssets.length
        ? dashboard.topValueProducingAssets
        : demoEconomicOutcomeData.topValueProducingAssets,
    highCostLowValueAssets:
      Array.isArray(dashboard.highCostLowValueAssets) &&
      dashboard.highCostLowValueAssets.length
        ? dashboard.highCostLowValueAssets
        : demoEconomicOutcomeData.highCostLowValueAssets,
    recentEconomicDecisions:
      Array.isArray(dashboard.recentEconomicDecisions) &&
      dashboard.recentEconomicDecisions.length
        ? dashboard.recentEconomicDecisions
        : demoEconomicOutcomeData.recentEconomicDecisions,
  };
}

export function useEconomicOutcomeData() {
  const [data, setData] = useState(normalizeEconomicOutcomePayload());
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let mounted = true;
    liveFetch<any>("/api/economic-outcomes/dashboard")
      .then((dashboard) => {
        if (mounted) {
          setData(normalizeEconomicOutcomePayload(dashboard));
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) setError(normalizeApiError(err));
      });
    return () => {
      mounted = false;
    };
  }, []);
  return { data, error };
}
