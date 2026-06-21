import React from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, ExecutivePageHeader, ExecutiveSection, MetricCard, StatusChip, statusToneFor } from '../components/executive'
import { notAvailable, useTechnologyPortfolio } from '../hooks/useTechnologyPortfolio'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import { formatCurrency, formatDateTime, formatPercent } from '../lib/display/formatters'
import { displayLabel } from '../lib/display/labels'

const money = (v?: number) => formatCurrency(v)

export function renderTechnologyPortfolioState(summary: any, isDemo = false) {
  return {
    demoBanner: isDemo ? 'Demo data' : '',
    empty: !isDemo && !summary.snapshot,
    annualSpend: money(summary.snapshot?.totalAnnualSpend),
    verifiedSavings: money(summary.snapshot?.totalFinanceVerifiedSavings),
    assetRows: summary.assets?.length ?? 0,
    riskCount: summary.risks?.length ?? 0,
    recommendationCount: summary.recommendations?.length ?? 0,
    unknown: money(undefined),
    proofPackReadiness: summary.proofPackReadiness ?? notAvailable,
    executionReadiness: summary.executionReadiness ?? notAvailable,
  }
}

function deriveCioNarrative(opts: { hasAssets: boolean; hasOwnership: boolean; hasFinance: boolean; hasRisks: boolean; hasRecommendations: boolean }): string {
  if (!opts.hasAssets) {
    return 'Technology Authority is not yet populated. Connect Microsoft 365, Flexera, ServiceNow, ERP or cloud sources to begin building an authoritative technology view.'
  }
  const fullyCovered = opts.hasOwnership && opts.hasFinance && opts.hasRisks && opts.hasRecommendations
  if (!fullyCovered) {
    return 'Technology discovery is active. Ownership, commercial and financial coverage remain incomplete.'
  }
  return 'Technology Authority is actively tracking assets, ownership, spend, risk and value opportunities.'
}

function deriveRiskNarrative(criticalCount: number, highCount: number, missingOwnerCount: number, missingCostCentreCount: number): string {
  if (criticalCount === 0 && highCount === 0 && missingOwnerCount === 0 && missingCostCentreCount === 0) {
    return 'No technology risks have been identified yet.'
  }
  if (missingOwnerCount > 0 && (criticalCount > 0 || highCount > 0)) {
    return 'Ownership gaps and renewal exposure represent the highest technology risks currently identified.'
  }
  if (missingOwnerCount > 0) {
    return 'Missing ownership assignments represent the highest technology risk currently identified.'
  }
  if (criticalCount > 0) {
    return 'Critical-severity risks represent the highest technology risk currently identified.'
  }
  if (highCount > 0) {
    return 'High-severity risks represent the highest technology risk currently identified.'
  }
  return 'Missing cost centre assignments represent the highest technology risk currently identified.'
}

export default function TechnologyPortfolio() {
  const { summary, isDemo, dataState } = useTechnologyPortfolio()
  const snap = summary.snapshot

  const hasAssets = !!snap && (snap.assetCount ?? 0) > 0
  const hasOwnership = !!snap && (snap.missingOwnerCount ?? 0) === 0 && hasAssets
  const hasFinance = !!snap && (snap.totalAnnualSpend ?? 0) > 0
  const hasRisks = summary.risks.length > 0
  const hasRecommendations = summary.recommendations.length > 0

  const ownershipCoveragePercent = snap && (snap.assetCount ?? 0) > 0
    ? Math.round((((snap.assetCount ?? 0) - (snap.missingOwnerCount ?? 0)) / (snap.assetCount || 1)) * 100)
    : undefined

  const highRiskCount = summary.risks.filter((r: any) => r.severity === 'CRITICAL' || r.severity === 'HIGH').length
  const valueOpportunity = summary.recommendations.reduce((total: number, r: any) => total + (r.projectedValue ?? 0), 0)

  const criticalCount = summary.risks.filter((r: any) => r.severity === 'CRITICAL').length
  const highCount = summary.risks.filter((r: any) => r.severity === 'HIGH').length

  const cioNarrative = deriveCioNarrative({ hasAssets, hasOwnership, hasFinance, hasRisks, hasRecommendations })
  const riskNarrative = deriveRiskNarrative(criticalCount, highCount, snap?.missingOwnerCount ?? 0, snap?.missingCostCentreCount ?? 0)

  return <Shell><main style={{ padding: '24px clamp(18px,3vw,34px)', display: 'grid', gap: 16, maxWidth: 1480, margin: '0 auto' }}>
    <ExecutivePageHeader
      title="Technology Authority"
      subtitle="The authoritative view of your technology estate, ownership, spend, risk and value opportunities."
      chips={[
        { label: `Tenant mode: ${isDemo ? 'Demo' : 'Live'}`, tone: isDemo ? 'info' : 'warning' },
        { label: `Last updated: ${snap ? formatDateTime(snap.generatedAt) : 'No data available yet.'}`, tone: 'info' },
        { label: `Readiness: ${snap ? displayLabel(snap.readiness) : 'No data available yet.'}`, tone: statusToneFor(snap?.readiness ?? 'missing_data') as any },
      ]}
    />
    {dataState !== 'LIVE' && <DataStateBanner state={dataState} ctaLabel={dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />}
    {!isDemo && !snap && <EmptyState title="No data available yet." description="Connect a source to begin discovery." />}

    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(180px,1fr))', gap: 12 }}>
      <MetricCard label="Technology Assets" value={hasAssets ? snap!.assetCount : 'Connect sources to discover assets.'} description="Discovered technology assets" />
      <MetricCard label="Ownership Coverage" value={ownershipCoveragePercent !== undefined ? formatPercent(ownershipCoveragePercent) : 'Ownership mapping not yet available.'} description="Assets with an assigned owner" />
      <MetricCard label="Annual Spend" value={hasFinance ? money(snap?.totalAnnualSpend) : 'Financial sources not yet connected.'} description="Total annual technology spend" />
      <MetricCard label="Risk Exposure" value={hasRisks ? highRiskCount : 'Risk analysis begins after discovery.'} description="Critical and high severity risks" />
      <MetricCard label="Value Opportunity" value={hasRecommendations ? money(valueOpportunity) : 'Available after analysis.'} description="Projected value from recommendations" />
    </section>

    <ExecutiveSection title="CIO Narrative" description="Technology Authority status">
      <p>{cioNarrative}</p>
    </ExecutiveSection>

    <ExecutiveSection title="Assets" description="Name, type, vendor, owner, cost centre, spend, verified savings, risk, completeness, and status.">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Name', 'Type', 'Vendor', 'Owner', 'Cost centre', 'Annual spend', 'Verified savings', 'Risk', 'Completeness', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: 8 }}>{h}</th>)}</tr></thead>
          <tbody>{summary.assets.map((a: any) => <tr key={a.id}>
            <td>{a.name}</td>
            <td>{displayLabel(a.assetType)}</td>
            <td>{a.vendorId ?? notAvailable}</td>
            <td>{a.ownerUserId ?? notAvailable}</td>
            <td>{a.costCentreId ?? notAvailable}</td>
            <td>{money(a.annualSpend)}</td>
            <td>{money(a.verifiedSavings)}</td>
            <td><StatusChip label={displayLabel(summary.risks.find((r: any) => r.targetId === a.id)?.severity ?? 'LOW')} tone={statusToneFor(summary.risks.find((r: any) => r.targetId === a.id)?.severity ?? 'LOW') as any} /></td>
            <td>{formatPercent(a.completenessScore)}</td>
            <td>{displayLabel(a.lifecycleStatus)}</td>
          </tr>)}</tbody>
        </table>
        {summary.assets.length === 0 && <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>No technology assets have been discovered yet. Run discovery or connect a supported source.</p>}
      </div>
    </ExecutiveSection>

    <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <ExecutiveSection title="Risks" description="Critical risks, high risks, missing owners, missing cost centres, renewal risks, unverified savings, evidence gaps.">
        <p>{riskNarrative}</p>
        <p>Critical risks: {criticalCount}</p>
        <p>High risks: {highCount}</p>
        <p>Missing owners: {snap?.missingOwnerCount ?? 0}</p>
        <p>Missing cost centres: {snap?.missingCostCentreCount ?? 0}</p>
        <p>Renewal risks: {snap?.renewalRiskCount ?? 0}</p>
        <p>Unverified savings: {snap?.unverifiedSavingsCount ?? 0}</p>
        <p>Evidence gaps: {summary.risks.filter((r: any) => r.riskType === 'EVIDENCE_GAP').length}</p>
      </ExecutiveSection>
      <ExecutiveSection title="Recommendations" description="Priority, target, recommendation, reason, projected value, and status.">
        {summary.recommendations.length === 0
          ? <p style={{ color: 'var(--text-secondary)' }}>Recommendations will appear after technology discovery and analysis are complete.</p>
          : summary.recommendations.map((r: any) => <div key={r.id} style={{ border: 'var(--border-default)', borderRadius: 12, padding: 10, marginBottom: 8 }}>
              <StatusChip label={displayLabel(r.priority)} tone={statusToneFor(r.priority) as any} /> <strong>{r.title}</strong>
              <p>Target: {r.targetId} · Reason: {r.description} · Projected value: {money(r.projectedValue)} · Status: {displayLabel(r.status)}</p>
            </div>)}
      </ExecutiveSection>
    </section>

    <ExecutiveSection title="Value and Coverage" description="Assets · Vendors · Applications · Risks · Recommendations · Value · Coverage">
      <p>Tabs: Assets | Vendors | Applications | Risks | Recommendations | Value | Coverage</p>
    </ExecutiveSection>

    <ExecutiveSection title="Proof pack readiness" description="Board pack status · CFO pack status · Audit pack status · Evidence export safety">
      <p>Board pack status: {summary.proofPackReadiness?.boardPackStatus ? displayLabel(summary.proofPackReadiness.boardPackStatus) : 'No data available yet.'}</p>
      <p>CFO pack status: {summary.proofPackReadiness?.cfoPackStatus ? displayLabel(summary.proofPackReadiness.cfoPackStatus) : 'No data available yet.'}</p>
      <p>Audit pack status: {summary.proofPackReadiness?.auditPackStatus ? displayLabel(summary.proofPackReadiness.auditPackStatus) : 'No data available yet.'}</p>
      <p>Evidence export safety: {summary.proofPackReadiness?.evidenceExportSafety ? displayLabel(summary.proofPackReadiness.evidenceExportSafety) : 'No data available yet.'}</p>
    </ExecutiveSection>

    <ExecutiveSection title="Governed execution" description="Execution plan status · dry-run status · blocked execution count · ready execution count">
      <p>Execution plan status: {summary.executionReadiness?.planStatus ? displayLabel(summary.executionReadiness.planStatus) : 'No data available yet.'}</p>
      <p>Dry-run status: {summary.executionReadiness?.dryRunStatus ? displayLabel(summary.executionReadiness.dryRunStatus) : 'No data available yet.'}</p>
      <p>Blocked execution count: {summary.executionReadiness?.blockedExecutionCount ?? 'No data available yet.'}</p>
      <p>Ready execution count: {summary.executionReadiness?.readyExecutionCount ?? 'No data available yet.'}</p>
    </ExecutiveSection>
  </main></Shell>
}
