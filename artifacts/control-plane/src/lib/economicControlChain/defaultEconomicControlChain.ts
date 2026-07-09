import { defaultAuthorities } from "../authorityCatalog/defaultAuthorities";

export type ChainStageKey = "DISCOVER" | "OWN" | "ANALYSE" | "APPROVE" | "EXECUTE" | "VERIFY" | "PROTECT";

export interface ChainStageMetric {
  label: string;
  value?: string;
}

export interface ChainStage {
  key: ChainStageKey;
  title: string;
  description: string;
  metrics: ChainStageMetric[];
  unavailableMessage: string;
  active: boolean;
}

export interface EconomicControlChainSummary {
  stages: ChainStage[];
  activeStageCount: number;
  healthStatus: "Healthy" | "Partial" | "Setup Required";
  narrative: string;
}

function buildNarrative(activeStageCount: number): string {
  if (activeStageCount === 0) {
    return "Certen has not yet completed discovery. Connect sources to begin building the Economic Control Chain.";
  }
  if (activeStageCount === 7) {
    return "Certen is identifying opportunities, executing governed actions, verifying outcomes and protecting retained value.";
  }
  return "Discovery is active. Opportunity analysis, execution and verification become available as more of the chain is connected.";
}

export function getDefaultEconomicControlChain(): EconomicControlChainSummary {
  const activeAuthorityCount = defaultAuthorities.length;
  const discoveryActive = defaultAuthorities.some((authority) => authority.status === "ACTIVE");

  const stages: ChainStage[] = [
    {
      key: "DISCOVER",
      title: "Discover",
      description: "Collect technology, commercial, financial and ownership signals from connected sources.",
      metrics: [
        { label: "Sources Connected" },
        { label: "Assets Discovered" },
        { label: "Authorities Available", value: activeAuthorityCount.toString() },
      ],
      unavailableMessage: "Connect sources to begin discovery.",
      active: discoveryActive,
    },
    {
      key: "OWN",
      title: "Own",
      description: "Link applications, contracts, spend, cost centres and accountable owners.",
      metrics: [
        { label: "Ownership Coverage" },
        { label: "Commercial Coverage" },
        { label: "Financial Coverage" },
      ],
      unavailableMessage: "Ownership and commercial mapping will appear after discovery.",
      active: false,
    },
    {
      key: "ANALYSE",
      title: "Analyse",
      description: "Identify risks, waste, duplication, renewal exposure and value opportunities.",
      metrics: [
        { label: "Opportunities" },
        { label: "Projected Value" },
        { label: "Risk Findings" },
      ],
      unavailableMessage: "Opportunity analysis is available after discovery and ownership mapping are complete.",
      active: false,
    },
    {
      key: "APPROVE",
      title: "Approve",
      description: "Govern actions through approval, trust and evidence controls.",
      metrics: [
        { label: "Awaiting Approval" },
        { label: "Ready Actions" },
        { label: "Blocked Actions" },
      ],
      unavailableMessage: "Approvals will appear once opportunities are identified.",
      active: false,
    },
    {
      key: "EXECUTE",
      title: "Execute",
      description: "Execute governed actions using certified authorities and execution controls.",
      metrics: [
        { label: "Actions Executed" },
        { label: "Execution Ready" },
        { label: "Execution Blocked" },
      ],
      unavailableMessage: "Execution begins after actions are approved.",
      active: false,
    },
    {
      key: "VERIFY",
      title: "Verify",
      description: "Verify realised outcomes using evidence, validation and finance reconciliation.",
      metrics: [
        { label: "Verified Outcomes" },
        { label: "Verified Value" },
        { label: "Finance Verified Value" },
      ],
      unavailableMessage: "Verification begins after execution.",
      active: false,
    },
    {
      key: "PROTECT",
      title: "Protect",
      description: "Monitor retained value, detect drift and trigger remediation.",
      metrics: [
        { label: "Protected Outcomes" },
        { label: "Retention Rate" },
        { label: "Drift Findings" },
      ],
      unavailableMessage: "Protection begins after verified outcomes exist.",
      active: false,
    },
  ];

  const activeStageCount = stages.filter((stage) => stage.active).length;

  let healthStatus: EconomicControlChainSummary["healthStatus"];
  if (activeStageCount === 7) {
    healthStatus = "Healthy";
  } else if (activeStageCount === 0) {
    healthStatus = "Setup Required";
  } else {
    healthStatus = "Partial";
  }

  return {
    stages,
    activeStageCount,
    healthStatus,
    narrative: buildNarrative(activeStageCount),
  };
}
