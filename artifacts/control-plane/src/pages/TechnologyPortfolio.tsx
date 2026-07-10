import { Shell } from '../components/layout/Shell'
import { EmptyState, ExecutivePageHeader, ExecutiveSection, MetricCard, StatusChip } from '../components/executive'
import { buildTechnologyManagementEvidencePack, notAvailable, summarizeTechnologyManagementKpis, useTechnologyPortfolio } from '../hooks/useTechnologyPortfolio'
import { inferTechnologyManagementDecision, program2TechnologyManagementRoute } from '../lib/program2TechnologyManagement'
import { program2Capabilities, program2ExecutiveQuestion } from '../lib/program2Completion'
import type { TechnologyManagementDecision, TechnologyPortfolioAsset, TechnologyPortfolioSummary } from '../types/technologyPortfolio'
import { DataStateBanner } from '../components/shared/DataStateBanner'

const money = (v?: number, c = 'USD') => v === undefined ? notAvailable : new Intl.NumberFormat(undefined, { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v)
const pct = (v?: number) => v === undefined ? notAvailable : `${Math.round(v)}%`
const tone = (s: string) => /CRITICAL|HIGH|MISSING|BLOCK|UNAVAILABLE/i.test(s) ? 'danger' : /PARTIAL|MEDIUM|REVIEW|OPTIMISE|CONSOLIDATE/i.test(s) ? 'warning' : /READY|ACTIVE|DEMO|LOW|KEEP|RENEW|COMPLETE/i.test(s) ? 'success' : 'info' as any

const legacyProgram2Question = 'Which technology assets, contracts, renewals, owners, overlaps, and risks require management action now?'
const executiveQuestion = program2ExecutiveQuestion

const decisionDescriptions: Record<TechnologyManagementDecision, string> = {
  KEEP: 'Evidence supports continuing current ownership, spend, and usage posture.',
  RENEW: 'Renewal can proceed with evidence-backed owner, usage, contract, and spend context.',
  OPTIMISE: 'Spend or utilisation evidence supports right-sizing before renewal or execution.',
  CONSOLIDATE: 'Overlap evidence supports rationalising duplicate capability.',
  RETIRE: 'Usage, owner, or business justification evidence supports retirement.',
  REVIEW: 'Management evidence is incomplete; owner, usage, spend, renewal, or risk must be reviewed.',
  BLOCKED: 'Decision is blocked by missing or high-risk evidence such as owner, renewal, usage, spend, or risk proof.',
}

export function renderTechnologyPortfolioState(summary: TechnologyPortfolioSummary, isDemo = false) {
  const kpis = summarizeTechnologyManagementKpis(summary)
  return {
    title: 'Technology Management',
    question: program2TechnologyManagementRoute.question,
    demoBanner: isDemo ? 'Demo technology management data' : '',
    empty: !isDemo && !summary.snapshot,
    governedAssets: kpis.totalGovernedAssets,
    missingOwner: kpis.assetsMissingOwner,
    renewalsInside90Days: kpis.renewalsInside90Days,
    duplicateCapabilities: kpis.duplicateCapabilitiesDetected,
    annualisedSpendUnderReview: money(kpis.annualisedSpendUnderReview, summary.snapshot?.currency),
    rationalisationOpportunity: money(kpis.rationalisationOpportunity, summary.snapshot?.currency),
    highRiskUnmanagedAssets: kpis.highRiskUnmanagedAssets,
    evidenceCompletenessRate: kpis.evidenceCompletenessRate === undefined ? notAvailable : `${kpis.evidenceCompletenessRate}%`,
    assetRows: summary.assets.length,
    riskCount: summary.risks.length,
    recommendationCount: summary.recommendations.length,
    decisions: summary.assets.map((asset) => inferTechnologyManagementDecision(asset, summary.risks.some((risk) => risk.targetId === asset.id && ['HIGH', 'CRITICAL'].includes(risk.severity)))),
    evidenceStatuses: summary.assets.map((asset) => buildTechnologyManagementEvidencePack(asset, summary).status),
    unknown: money(undefined),
    proofPackReadiness: summary.proofPackReadiness ?? {},
    executionReadiness: summary.executionReadiness ?? {},
  }
}

function DecisionChip({ decision }: { decision: TechnologyManagementDecision }) {
  return <StatusChip label={decision} tone={tone(decision) as any} />
}

function AssetEvidenceDetail({ asset, summary }: { asset: TechnologyPortfolioAsset; summary: TechnologyPortfolioSummary }) {
  const risk = summary.risks.find((item) => item.targetId === asset.id)
  const renewal = summary.renewals?.find((item) => item.assetId === asset.id)
  const duplicate = summary.duplicateCapabilities?.find((item) => item.assetIds.includes(asset.id))
  const decision = inferTechnologyManagementDecision(asset, risk?.severity === 'HIGH' || risk?.severity === 'CRITICAL')
  const completeness = buildTechnologyManagementEvidencePack(asset, summary)
  return <div style={{ border: 'var(--border-default)', borderRadius: 12, padding: 12, display: 'grid', gap: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{asset.name}</strong><DecisionChip decision={decision} /></div>
    <p style={{ margin: 0 }}>{decisionDescriptions[decision]}</p>
    <p style={{ margin: 0 }}>Evidence Pack / Proof Pack: <StatusChip label={completeness.status} tone={tone(completeness.status) as any} /> {completeness.missing.length ? `Missing: ${completeness.missing.join(', ')}` : 'Complete management evidence available.'}</p>
    <p style={{ margin: 0 }}>Owner: {asset.ownerUserId ?? asset.ownerStatus ?? notAvailable} · Business unit/cost centre: {asset.businessUnit ?? asset.costCentreId ?? notAvailable} · Renewal: {renewal?.renewalDate ?? asset.renewalDate ?? notAvailable}</p>
    <p style={{ margin: 0 }}>Spend/value basis: {money(asset.annualSpend, asset.currency)} · Usage/utilisation basis: {asset.utilisation === undefined ? notAvailable : `${asset.utilisation}%`} · Risk/overlap reason: {risk?.description ?? duplicate?.overlapReason ?? notAvailable}</p>
    <p style={{ margin: 0 }}>Verification status: {asset.evidenceCompletenessStatus ?? notAvailable} · Confidence: {asset.completenessScore}% · Timestamp/lineage: {summary.snapshot?.generatedAt ?? notAvailable} · Outcome/protection state: {asset.lifecycleStatus}</p>
  </div>
}

export default function TechnologyPortfolio() {
  const { summary, isDemo, isLiveUnconnected, loading, dataState } = useTechnologyPortfolio()
  const snap = summary.snapshot
  const currency = snap?.currency ?? 'USD'
  const kpis = summarizeTechnologyManagementKpis(summary)
  return <Shell><main style={{ padding: '24px clamp(18px,3vw,34px)', display: 'grid', gap: 16, maxWidth: 1480, margin: '0 auto' }}>
    <ExecutivePageHeader title='Technology Management' subtitle={`${executiveQuestion} Govern the portfolio by ownership, renewal risk, duplicate capability, rationalisation opportunity, value leakage, and evidence-backed management decision.`} chips={[{ label: `Tenant mode: ${isDemo ? 'Demo' : 'Live'}`, tone: isDemo ? 'info' : 'warning' }, { label: `Last updated: ${snap ? new Date(snap.generatedAt).toLocaleString() : notAvailable}`, tone: 'info' }, { label: `Portfolio readiness: ${snap?.readiness ?? 'MISSING_DATA'}`, tone: tone(snap?.readiness ?? 'MISSING') as any }]} />
    {dataState && dataState !== 'LIVE' && dataState !== 'DEMO' && <DataStateBanner state={dataState} ctaLabel={dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />}
    {isDemo && <div data-testid='demo-banner' style={{ border: '1px solid rgba(45,212,191,.24)', borderRadius: 14, padding: 12 }}><strong>Demo technology management data</strong><p style={{ margin: '4px 0 0' }}>Synthetic but coherent portfolio data for management decisions. No production systems are connected.</p></div>}
    {!isDemo && !snap && <EmptyState title='No data available yet.' description='Connect a source to begin discovery.' />}
    {loading && <p role='status'>Loading Technology Management evidence…</p>}


    <ExecutiveSection title='Technology Management Workspace' description={`One executive operating environment across portfolio, ownership, vendors, utilisation, renewals and evidence. Legacy framing: ${legacyProgram2Question} Evidence Pack / Proof Pack · Management Decision · Renewal Risk · Duplicate Capability · Rationalisation Opportunity. No demo assets, owners, renewals, vendors, utilisation, decisions, savings or confidence are shown in LIVE_UNCONNECTED.`}>{program2Capabilities.map((capability) => <a key={capability.key} href={capability.route} style={{ display:'inline-flex', margin:'0 8px 8px 0', border:'var(--border-default)', borderRadius:999, padding:'8px 12px', color:'var(--teal)', fontWeight:800 }}>{capability.label}</a>)}</ExecutiveSection>

    <section data-testid='technology-management-kpis' style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(180px,1fr))', gap: 12 }}>
      <MetricCard label='Total governed assets' value={kpis.totalGovernedAssets} description='Assets under portfolio management authority.' />
      <MetricCard label='Assets missing owner' value={kpis.assetsMissingOwner} description='Missing Owner requires REVIEW or BLOCKED.' />
      <MetricCard label='Renewals inside 90 days' value={kpis.renewalsInside90Days} description='Renewal Risk requiring management decision.' />
      <MetricCard label='Duplicate capabilities detected' value={kpis.duplicateCapabilitiesDetected} description='Duplicate Capability / overlap evidence.' />
      <MetricCard label='Annualised spend under review' value={money(kpis.annualisedSpendUnderReview, currency)} description='Spend requiring management action.' />
      <MetricCard label='Rationalisation opportunity' value={summary.recommendations.length ? money(kpis.rationalisationOpportunity, currency) : 'Available after analysis.'} description='Optimise, consolidate, or retire potential.' />
      <MetricCard label='High-risk unmanaged assets' value={kpis.highRiskUnmanagedAssets} description='Unowned or unmanaged risk.' />
      <MetricCard label='Evidence completeness rate' value={pct(kpis.evidenceCompletenessRate)} description='Complete Evidence Pack / Proof Pack rate.' />
    </section>

    {isLiveUnconnected && <ExecutiveSection title='LIVE_UNCONNECTED evidence boundary' description='Portfolio evidence requires connected authoritative sources.'><p>No demo assets, synthetic owners, renewals, savings, overlaps, recommendations, or management decisions are displayed in live-unconnected mode.</p></ExecutiveSection>}

    <ExecutiveSection title='Management Decision Model' description='KEEP · RENEW · OPTIMISE · CONSOLIDATE · RETIRE · REVIEW · BLOCKED'>{(Object.keys(decisionDescriptions) as TechnologyManagementDecision[]).map((decision) => <p key={decision}><DecisionChip decision={decision} /> {decisionDescriptions[decision]}</p>)}</ExecutiveSection>

    <ExecutiveSection title='Governed Assets' description='Asset, source, owner, business unit, cost centre, spend, usage, renewal, risk, Evidence Pack, and Management Decision.'>{summary.assets.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Asset', 'Capability', 'Vendor/source', 'Owner', 'Business unit', 'Cost centre', 'Annual spend', 'Utilisation', 'Renewal', 'Risk', 'Evidence Pack', 'Management Decision'].map((h) => <th key={h} style={{ textAlign: 'left', padding: 8 }}>{h}</th>)}</tr></thead><tbody>{summary.assets.map((asset) => { const risk = summary.risks.find((item) => item.targetId === asset.id); const evidence = buildTechnologyManagementEvidencePack(asset, summary); const decision = inferTechnologyManagementDecision(asset, risk?.severity === 'HIGH' || risk?.severity === 'CRITICAL'); return <tr key={asset.id}><td>{asset.name}</td><td>{asset.capability ?? notAvailable}</td><td>{asset.vendorId ?? notAvailable}</td><td>{asset.ownerUserId ?? asset.ownerStatus ?? notAvailable}</td><td>{asset.businessUnit ?? notAvailable}</td><td>{asset.costCentreId ?? notAvailable}</td><td>{money(asset.annualSpend, asset.currency ?? currency)}</td><td>{asset.utilisation === undefined ? notAvailable : `${asset.utilisation}%`}</td><td>{asset.renewalDate ?? notAvailable}</td><td><StatusChip label={risk?.severity ?? 'LOW'} tone={tone(risk?.severity ?? 'LOW') as any} /></td><td><StatusChip label={evidence.status} tone={tone(evidence.status) as any} /></td><td><DecisionChip decision={decision} /></td></tr> })}</tbody></table></div> : <EmptyState title='No governed assets yet.' description='Connected portfolio sources will populate governed assets when live evidence is available.' />}</ExecutiveSection>

    <ExecutiveSection title='Asset Detail Evidence Packs' description='Reachable detail evidence is shown inline and marked COMPLETE or PARTIAL instead of hidden behind links.'>{summary.assets.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 12 }}>{summary.assets.map((asset) => <AssetEvidenceDetail key={asset.id} asset={asset} summary={summary} />)}</div> : <EmptyState title='No asset detail evidence yet.' description='No asset detail, owner, renewal, usage, spend, risk, or outcome evidence is available until portfolio sources are connected.' />}</ExecutiveSection>

    <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <ExecutiveSection title='Renewal Risk' description='Contracts and renewals requiring KEEP, RENEW, OPTIMISE, RETIRE, REVIEW, or BLOCKED decisions.'>{summary.renewals?.length ? summary.renewals.map((renewal) => <p key={renewal.id}><StatusChip label={renewal.renewalRisk} tone={tone(renewal.renewalRisk) as any} /> {renewal.vendor} · {renewal.renewalDate} · {money(renewal.annualSpend, currency)} · <DecisionChip decision={renewal.recommendedDecision} /></p>) : <EmptyState title='No renewal evidence yet.' description='Renewal risk remains unavailable until contract and renewal sources are connected.' />}</ExecutiveSection>
      <ExecutiveSection title='Duplicate Capability' description='Overlapping tools and rationalisation opportunity by capability.'>{summary.duplicateCapabilities?.length ? summary.duplicateCapabilities.map((dup) => <p key={dup.id}>{dup.capability} · {dup.assetIds.length} assets · {dup.overlapReason} · {money(dup.annualSpend, currency)} · <DecisionChip decision={dup.recommendedDecision} /></p>) : <EmptyState title='No duplicate capability evidence yet.' description='Overlap detection requires connected product, usage, and contract evidence.' />}</ExecutiveSection>
    </section>

    <ExecutiveSection title='Rationalisation Opportunity and Value Leakage' description='Evidence-backed management recommendations; REVIEW/BLOCKED when evidence is missing.'>{summary.recommendations.length ? summary.recommendations.map((rec) => <div key={rec.id} style={{ border: 'var(--border-default)', borderRadius: 12, padding: 10, marginBottom: 8 }}><StatusChip label={rec.priority} tone={tone(rec.priority) as any} /> <DecisionChip decision={rec.decision} /> <strong> {rec.title}</strong><p>Target: {rec.targetId} · Reason: {rec.description} · Projected value: {money(rec.projectedValue, rec.currency ?? currency)} · Evidence: {rec.evidenceIds.join(', ') || notAvailable} · Status: {rec.status}</p></div>) : <EmptyState title='No management recommendations yet.' description='No recommendations, savings, overlaps, or outcomes are invented without live evidence.' />}</ExecutiveSection>

    <ExecutiveSection title='Evidence Pack / Proof Pack readiness' description='Board pack status · CFO pack status · Audit pack status · Evidence export safety'><p>Board pack status: {summary.proofPackReadiness?.boardPackStatus ?? notAvailable}</p><p>CFO pack status: {summary.proofPackReadiness?.cfoPackStatus ?? notAvailable}</p><p>Audit pack status: {summary.proofPackReadiness?.auditPackStatus ?? notAvailable}</p><p>Evidence export safety: {summary.proofPackReadiness?.evidenceExportSafety ?? notAvailable}</p></ExecutiveSection>
  </main></Shell>
}
