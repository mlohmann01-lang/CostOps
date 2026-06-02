import { Shell } from '../components/layout/Shell'
import { LiveDataError, SectionLabel, StatusPill } from '../components/shared/Foundation'
import { useExecutiveValueData } from '../hooks/useExecutiveValueData'

function money(value: number) { return `$${Math.round(Number(value ?? 0)).toLocaleString()}` }
function sourceLabel(value?: { source?: string }) { return String(value?.source ?? 'UNAVAILABLE').replace(/_/g, ' ') }

export default function ExecutiveValueDashboard() {
  const { summary, domains, topDrivers, blockers, loading, error, refresh, generateEvidencePack } = useExecutiveValueData()
  if (error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
  const metrics = summary.valueMetrics ?? {}
  const sources = summary.metricSources ?? {}
  const confidence = summary.confidence ?? {}
  const narrative = summary.narrative ?? {}
  const funnel = [
    ['Projected', metrics.projectedMonthlySavings, metrics.projectedAnnualSavings, undefined, sources.projectedMonthlySavings],
    ['Approved', metrics.approvedMonthlySavings, metrics.approvedAnnualSavings, summary.conversionRates?.approvedVsProjectedPercent, sources.approvedMonthlySavings],
    ['Executed', metrics.executedMonthlySavings, metrics.executedAnnualSavings, summary.conversionRates?.executedVsApprovedPercent, sources.executedMonthlySavings],
    ['Verified', metrics.verifiedMonthlySavings, metrics.verifiedAnnualSavings, summary.conversionRates?.verifiedVsExecutedPercent, sources.verifiedMonthlySavings],
    ['Retained', metrics.retainedMonthlySavings, metrics.retainedAnnualSavings, summary.conversionRates?.retainedVsVerifiedPercent, sources.retainedMonthlySavings],
    ['Protected', metrics.protectedMonthlySavings, metrics.protectedAnnualSavings, summary.conversionRates?.protectedVsVerifiedPercent, sources.protectedMonthlySavings],
  ]
  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><div><SectionLabel>Board / CIO / CFO view</SectionLabel><h1>Executive Value Dashboard</h1><p>Projected, approved, executed, verified, and protected savings.</p></div><button disabled={loading} onClick={() => void generateEvidencePack()}>Generate Executive Evidence Pack</button></header>
    <section data-testid='executive-value-funnel' style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>{funnel.map(([label, monthly, annual, conversion, metricSource]: any) => <div key={label} style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>{label}</SectionLabel><strong>{money(monthly)}</strong><div>Annual {money(annual)}</div>{conversion !== undefined && <div>{conversion}% conversion</div>}<small>Source: {sourceLabel(metricSource)}</small></div>)}</section>
    <section data-testid='executive-value-narrative' style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Executive Narrative</SectionLabel><h2>{narrative.headline}</h2><p>{narrative.executiveSummary}</p><p>{narrative.valueRealizationSummary}</p><p>{narrative.confidenceSummary}</p><p>{narrative.riskSummary}</p><ul>{(narrative.nextBestActions ?? []).map((action: string) => <li key={action}>{action}</li>)}</ul></section>
    <section data-testid='executive-value-confidence' style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>{[['Evidence Completeness', `${confidence.evidenceCompletenessPercent ?? 0}%`], ['Outcome Confidence', confidence.outcomeConfidenceBand ?? 'UNKNOWN'], ['Trust Coverage', `${confidence.trustCoveragePercent ?? 0}%`], ['Connector Coverage', `${confidence.connectorCoveragePercent ?? 0}%`], ['Execution Coverage', `${confidence.executionCoveragePercent ?? 0}%`]].map(([label, value]) => <div key={label} style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>{label}</SectionLabel><strong>{value}</strong><div>Source: reused authority data</div></div>)}</section>
    <section data-testid='executive-value-domains' style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Value by Domain</SectionLabel><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, fontWeight: 600 }}><span>Domain</span><span>Projected</span><span>Verified</span><span>Protected</span><span>Confidence</span></div>{domains.map((domain: any) => <div key={domain.domain} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, borderTop: 'var(--border-default)', padding: '8px 0' }}><span>{domain.domain}</span><span>{money(domain.projectedMonthlySavings)}</span><span>{money(domain.verifiedMonthlySavings)}</span><span>{money(domain.protectedMonthlySavings)}</span><span>{domain.confidenceBand}</span></div>)}</section>
    <section data-testid='executive-value-drivers' style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Top Value Drivers</SectionLabel>{topDrivers.map((driver: any) => <div key={driver.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 8, borderTop: 'var(--border-default)', padding: '8px 0' }}><span>{driver.title}</span><span>{driver.source}</span><span>{driver.domain}</span><span>{money(driver.projectedMonthlySavings)}</span><span>{money(driver.verifiedMonthlySavings)}</span><span>{driver.evidencePackId ? <a href={`/evidence-packs`}>Evidence pack</a> : 'Generate evidence'}</span></div>)}</section>
    <section data-testid='executive-value-blockers' style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Blocked Value / Risks</SectionLabel>{blockers.map((blocker: any) => <div key={blocker.id} style={{ borderTop: 'var(--border-default)', padding: '8px 0' }}><StatusPill status='blocked' /> {blocker.type}: {blocker.title} · {money(blocker.blockedValue)} · {blocker.reason} · {blocker.recommendedAction}</div>)}</section>
    <section data-testid='executive-value-evidence-cta' style={{ border: 'var(--border-teal)', borderRadius: 10, padding: 12 }}><SectionLabel>Evidence Pack CTA</SectionLabel><button disabled={loading} onClick={() => void generateEvidencePack()}>Generate Executive Evidence Pack</button></section>
  </div></Shell>
}
