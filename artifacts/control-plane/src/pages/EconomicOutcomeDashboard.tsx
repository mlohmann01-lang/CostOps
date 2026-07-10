import React from "react";
import { Shell } from "../components/layout/Shell";
import { useEconomicOutcomeData } from "../hooks/useEconomicOutcomeData";

const money = (value: unknown) => `$${Number(value ?? 0).toLocaleString()}`;
const ratio = (value: unknown) =>
  value === undefined ? "N/A" : Number(value).toFixed(2);
function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        border: "var(--border-default)",
        borderRadius: 14,
        padding: 14,
        background: "var(--surface-1)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: ".08em",
        }}
      >
        {label}
      </div>
      <strong style={{ fontSize: 22 }}>{value}</strong>
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "8px 0",
        borderBottom: "var(--border-default)",
      }}
    >
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function EconomicOutcomeDashboard() {
  const { data } = useEconomicOutcomeData();
  const summary = data.summary;
  const selected = data.assetSummaries[0];
  return (
    <Shell>
      <div style={{ padding: 24, display: "grid", gap: 18 }}>
        <header style={{ maxWidth: 980 }}>
          <h1 style={{ margin: 0 }}>Economic Outcome Dashboard</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)" }}>
            Connect technology and AI assets to usage, spend, business outcomes,
            value signals, attribution and economic decisions.
          </p>
        </header>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          <Card label="Total Outcomes" value={summary.totalOutcomes} />
          <Card label="Measured Outcomes" value={summary.measuredOutcomes} />
          <Card label="Unproven Outcomes" value={summary.unprovenOutcomes} />
          <Card
            label="Total Attributed Value"
            value={money(summary.totalAttributedValue)}
          />
          <Card
            label="Total Attributed Cost"
            value={money(summary.totalAttributedCost)}
          />
          <Card label="Net Value" value={money(summary.netValue)} />
          <Card
            label="Assets With Insufficient Evidence"
            value={summary.assetsWithInsufficientEvidence}
          />
          <Card
            label="Keep / Optimise / Expand / Retire Counts"
            value={`${summary.keepCount} / ${summary.optimiseCount} / ${summary.expandCount} / ${summary.retireCount}`}
          />
        </section>
        <section
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div
            style={{
              border: "var(--border-default)",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <h2>Top Value-Producing Assets</h2>
            {data.topValueProducingAssets.map((item: any) => (
              <Row
                key={item.assetId}
                label={item.asset?.name ?? item.assetId}
                value={`${money(item.netValue)} net`}
              />
            ))}
          </div>
          <div
            style={{
              border: "var(--border-default)",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <h2>High-Cost Low-Value Assets</h2>
            {data.highCostLowValueAssets.map((item: any) => (
              <Row
                key={item.assetId}
                label={item.asset?.name ?? item.assetId}
                value={`${money(item.spend)} spend`}
              />
            ))}
          </div>
        </section>
        <section
          style={{
            border: "var(--border-default)",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <h2>Asset Outcome Summary</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <Row
              label="Asset Name"
              value={
                selected?.asset?.name ?? selected?.assetId ?? "Unknown asset"
              }
            />
            <Row
              label="Asset Type"
              value={selected?.asset?.assetType ?? "AI Asset"}
            />
            <Row
              label="Owner"
              value={
                selected?.owner ?? selected?.asset?.ownerId ?? "Unassigned"
              }
            />
            <Row label="Spend" value={money(selected?.spend)} />
            <Row label="Usage" value={selected?.usageCount ?? 0} />
            <Row
              label="Measured Value"
              value={money(selected?.measuredValue)}
            />
            <Row label="Net Value" value={money(selected?.netValue)} />
            <Row
              label="Value-to-Cost Ratio"
              value={ratio(selected?.valueToCostRatio)}
            />
            <Row
              label="Decision"
              value={selected?.decision ?? "INSUFFICIENT_EVIDENCE"}
            />
            <Row label="Confidence" value={selected?.confidence ?? "UNKNOWN"} />
            <Row label="Evidence Count" value={selected?.evidenceCount ?? 0} />
          </div>
        </section>
        <section
          style={{
            border: "var(--border-default)",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <h2>Recent Economic Decisions</h2>
          {data.recentEconomicDecisions.map((decision: any) => (
            <Row
              key={decision.id ?? decision.assetId}
              label={decision.decision}
              value={`${decision.confidence} confidence`}
            />
          ))}
        </section>
      </div>
    </Shell>
  );
}
