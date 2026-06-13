import React, { useState } from 'react'
import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { MetricCard, SectionLabel } from '../components/shared/Foundation'
import { useTechnologyPortfolioAuthorityData, type PortfolioAsset, type PortfolioRenewal } from '../hooks/useTechnologyPortfolioAuthorityData'

function Badge({ label, tone = 'teal' }: { label: string; tone?: 'green' | 'amber' | 'red' | 'teal' | 'muted' }) {
  const color = tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : tone === 'green' ? 'var(--green)' : tone === 'muted' ? 'var(--text-tertiary)' : 'var(--teal)'
  const bg = tone === 'red' ? 'var(--red-bg)' : tone === 'amber' ? 'var(--amber-bg)' : tone === 'green' ? 'var(--green-bg)' : tone === 'muted' ? 'rgba(255,255,255,.05)' : 'rgba(45,212,191,.08)'
  return <span style={{ display: 'inline-flex', borderRadius: 999, padding: '3px 8px', fontSize: 11, color, background: bg, fontWeight: 700 }}>{label}</span>
}

function Card({ children }: { children: React.ReactNode }) {
  return <section style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 14, padding: 16 }}>{children}</section>
}

function certTone(s: string): 'green' | 'amber' | 'red' | 'muted' {
  if (s === 'CERTIFIED') return 'green'
  if (s === 'PARTIAL') return 'amber'
  if (s === 'NOT_CERTIFIED') return 'red'
  return 'muted'
}

function riskTone(score: number | undefined): 'green' | 'amber' | 'red' | 'muted' {
  if (score === undefined) return 'muted'
  if (score >= 60) return 'red'
  if (score >= 30) return 'amber'
  return 'green'
}

function statusTone(s: string): 'green' | 'amber' | 'red' | 'muted' {
  if (s === 'ACTIVE' || s === 'PROTECTED') return 'green'
  if (s === 'UNDER_REVIEW' || s === 'OPTIMISING') return 'amber'
  if (s === 'DRIFTED' || s === 'RETIRED') return 'red'
  return 'muted'
}

function renewalRiskTone(risk: string): 'green' | 'amber' | 'red' | 'muted' {
  if (risk === 'CRITICAL') return 'red'
  if (risk === 'HIGH') return 'amber'
  if (risk === 'MEDIUM') return 'amber'
  return 'green'
}

function fmt(n: number | undefined): string {
  if (n === undefined) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function AssetDetail({ asset, onClose }: { asset: PortfolioAsset; onClose(): void }) {
  return (
    <div style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 14, padding: 20, marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <strong style={{ fontSize: 15 }}>{asset.name}</strong>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, fontSize: 12, marginBottom: 16 }}>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Asset Summary</span><div><Badge label={asset.assetType} tone='teal' /></div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Source Wedge</span><div>{asset.sourceWedge}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Status</span><div><Badge label={asset.status} tone={statusTone(asset.status)} /></div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Owner</span><div>{asset.ownerName ?? '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Business Unit</span><div>{asset.businessUnit ?? '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Cost Centre</span><div>{asset.costCentre ?? '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Annual Cost</span><div>{fmt(asset.annualCost)}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Annual Value</span><div>{fmt(asset.annualValue)}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Protected Value</span><div>{fmt(asset.protectedAnnualValue)}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Utilisation</span><div>{asset.utilisationScore !== undefined ? `${asset.utilisationScore}%` : '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Risk Score</span><div><Badge label={`${asset.riskScore ?? 0}`} tone={riskTone(asset.riskScore)} /></div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Certification Source</span><div style={{ fontFamily: 'monospace', fontSize: 11 }}>{asset.sourceWedge.toLowerCase()}-wedge-certification</div></div>
      </div>
      {asset.renewalDate && (
        <div style={{ fontSize: 12, marginBottom: 12 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Renewal Date</span>
          <div>{asset.renewalDate}</div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 12 }}>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Recommendations</span><div>{asset.recommendationIds.length || '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Governed Actions</span><div>{asset.governedActionIds.length || '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Outcomes</span><div>{asset.outcomeIds.length || '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Protected Outcomes</span><div>{asset.protectedOutcomeIds.length || '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Evidence</span><div>{asset.evidenceIds.length || '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Contract</span><div>{asset.contractId ?? '—'}</div></div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Badge label={asset.certificationStatus} tone={certTone(asset.certificationStatus)} />
      </div>
    </div>
  )
}

function buildNarrative(health: ReturnType<typeof useTechnologyPortfolioAuthorityData>['health']): string {
  const { totalAssets, ownerCoveragePercent, protectedAnnualValue, highRiskAssets, renewalRiskAssets, driftedAssets } = health
  const protFmt = protectedAnnualValue >= 1_000_000 ? `$${(protectedAnnualValue / 1_000_000).toFixed(1)}M` : `$${Math.round(protectedAnnualValue / 1_000)}K`
  return `Technology Portfolio Authority is tracking ${totalAssets} assets across 8 certified wedges. Owner coverage is ${ownerCoveragePercent}%, and ${protFmt} of annual value is protected. ${highRiskAssets} high-risk asset${highRiskAssets === 1 ? '' : 's'} require remediation, from missing owners, upcoming renewals and drifted protected outcomes. ${renewalRiskAssets} contract renewal${renewalRiskAssets === 1 ? '' : 's'} are due within 90 days. ${driftedAssets} asset${driftedAssets === 1 ? ' has' : 's have'} drifted from their protected state.`
}

export default function TechnologyPortfolioAuthorityView() {
  const { health, assets, owners, contracts, renewals, isDemo, loading, error } = useTechnologyPortfolioAuthorityData()
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const selectedAsset = assets.find((a) => a.id === selectedAssetId)
  const narrative = buildNarrative(health)

  const lowUtilHighCost = assets.filter((a) => (a.utilisationScore ?? 100) < 40 && (a.annualCost ?? 0) > 10000)
  const missingOwner = assets.filter((a) => !a.ownerId && !a.ownerName)
  const missingCostCentre = assets.filter((a) => !a.costCentre)
  const driftedAssets = assets.filter((a) => a.status === 'DRIFTED')

  return (
    <Shell>
      <div style={{ padding: 24, display: 'grid', gap: 18 }}>
        <header style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Technology Portfolio Authority</h1>
            <Badge label={`${assets.length} Assets`} tone='teal' />
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Canonical view of assets, owners, costs, utilisation, contracts, renewals, governed actions, outcomes and protected value across all certified wedges.</p>
          {isDemo && <Badge label='Demo fallback data' tone='amber' />}
          {loading && <p>Loading Technology Portfolio Authority…</p>}
          {error && <p role='alert' style={{ color: 'var(--amber)' }}>Portfolio APIs unavailable. Showing demo fallback data.</p>}
        </header>

        <Card>
          <SectionLabel>Deterministic Narrative</SectionLabel>
          <p style={{ fontSize: 14, margin: '8px 0 0', lineHeight: 1.7 }}>{narrative}</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '6px 0 0' }}>Technology Portfolio Authority is tracking {health.totalAssets} assets across 8 certified wedges.</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>Owner coverage is {health.ownerCoveragePercent}%, cost-centre coverage is {health.costCentreCoveragePercent}%, and ${(health.protectedAnnualValue / 1_000_000).toFixed(1)}M of annual value is protected.</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>{health.highRiskAssets} high-risk assets require remediation, mostly from missing owners, upcoming renewals and drifted protected outcomes.</p>
        </Card>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
          <MetricCard label='Total Assets' value={String(health.totalAssets)} delta={`${health.activeAssets} active`} />
          <MetricCard label='Certified Assets' value={String(health.certifiedAssets)} delta={`of ${health.totalAssets} total`} />
          <MetricCard label='Annual Cost' value={fmt(health.totalAnnualCost)} />
          <MetricCard label='Annual Value' value={fmt(health.totalAnnualValue)} />
        </section>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
          <MetricCard label='Protected Value' value={fmt(health.protectedAnnualValue)} />
          <MetricCard label='Owner Coverage' value={`${health.ownerCoveragePercent}%`} />
          <MetricCard label='Governance Coverage' value={`${health.governanceCoveragePercent}%`} />
          <MetricCard label='High Risk Assets' value={String(health.highRiskAssets)} />
        </section>

        <Card>
          <SectionLabel>Domain Breakdown</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 8, marginTop: 12, fontSize: 12 }}>
            <strong>Wedge</strong>
            <strong>Assets</strong>
            <strong>Annual Cost</strong>
            <strong>Protected Value</strong>
            <strong>Certified</strong>
            <strong>High Risk</strong>
            {health.domainBreakdown.map((row) => (
              <React.Fragment key={row.sourceWedge}>
                <span>{row.sourceWedge}</span>
                <span>{row.assetCount}</span>
                <span>{fmt(row.annualCost)}</span>
                <span>{fmt(row.protectedAnnualValue)}</span>
                <span>{row.certifiedAssets}</span>
                <span style={{ color: row.highRiskAssets > 0 ? 'var(--amber)' : 'var(--text-tertiary)' }}>{row.highRiskAssets}</span>
              </React.Fragment>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>Portfolio Asset Table</SectionLabel>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr .8fr .8fr .8fr .8fr .8fr .8fr .8fr .8fr .7fr .6fr .8fr .7fr', gap: 8, fontSize: 11, minWidth: 1200 }}>
              <strong>Name</strong>
              <strong>Type</strong>
              <strong>Source Wedge</strong>
              <strong>Vendor</strong>
              <strong>Owner</strong>
              <strong>Cost Centre</strong>
              <strong>Annual Cost</strong>
              <strong>Annual Value</strong>
              <strong>Protected Value</strong>
              <strong>Utilisation</strong>
              <strong>Risk</strong>
              <strong>Certification</strong>
              <strong>Status</strong>
              {assets.map((a) => (
                <React.Fragment key={a.id}>
                  <span>
                    <button style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline', textAlign: 'left' }}
                      onClick={() => setSelectedAssetId(selectedAssetId === a.id ? null : a.id)}>
                      {a.name}
                    </button>
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{a.assetType}</span>
                  <span>{a.sourceWedge}</span>
                  <span>{a.vendor ?? '—'}</span>
                  <span>{a.ownerName ?? <span style={{ color: 'var(--amber)' }}>Missing</span>}</span>
                  <span>{a.costCentre ?? <span style={{ color: 'var(--amber)' }}>Missing</span>}</span>
                  <span>{fmt(a.annualCost)}</span>
                  <span>{fmt(a.annualValue)}</span>
                  <span>{fmt(a.protectedAnnualValue)}</span>
                  <span>{a.utilisationScore !== undefined ? `${a.utilisationScore}%` : '—'}</span>
                  <span><Badge label={`${a.riskScore ?? 0}`} tone={riskTone(a.riskScore)} /></span>
                  <span><Badge label={a.certificationStatus} tone={certTone(a.certificationStatus)} /></span>
                  <span><Badge label={a.status} tone={statusTone(a.status)} /></span>
                </React.Fragment>
              ))}
            </div>
          </div>
          {selectedAsset && <AssetDetail asset={selectedAsset} onClose={() => setSelectedAssetId(null)} />}
        </Card>

        <Card>
          <SectionLabel>Owners</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr', gap: 8, marginTop: 12, fontSize: 12 }}>
            <strong>Owner</strong>
            <strong>Business Unit</strong>
            <strong>Cost Centre</strong>
            <strong>Assets</strong>
            <strong>Actions</strong>
            <strong>Outcomes</strong>
            {owners.map((o) => (
              <React.Fragment key={o.id}>
                <span>{o.name}</span>
                <span>{o.businessUnit ?? '—'}</span>
                <span>{o.costCentre ?? '—'}</span>
                <span>{o.assetIds.length}</span>
                <span>{o.actionIds.length}</span>
                <span>{o.outcomeIds.length}</span>
              </React.Fragment>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>Contracts &amp; Renewals</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr 1fr 1fr 1fr', gap: 8, marginTop: 12, fontSize: 12 }}>
            <strong>Vendor</strong>
            <strong>Contract</strong>
            <strong>Renewal Date</strong>
            <strong>Days Until Renewal</strong>
            <strong>Annual Value</strong>
            <strong>Risk</strong>
            <strong>Linked Assets</strong>
            {contracts.map((c) => {
              const renewal = renewals.find((r) => r.contractId === c.id)
              return (
                <React.Fragment key={c.id}>
                  <span>{c.vendor}</span>
                  <span>{c.contractName}</span>
                  <span>{c.renewalDate ?? '—'}</span>
                  <span>{renewal ? renewal.daysUntilRenewal : '—'}</span>
                  <span>{fmt(c.annualValue)}</span>
                  <span><Badge label={c.riskLevel} tone={c.riskLevel === 'CRITICAL' ? 'red' : c.riskLevel === 'HIGH' ? 'amber' : 'muted'} /></span>
                  <span>{c.linkedAssetIds.length}</span>
                </React.Fragment>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionLabel>Risk &amp; Opportunity</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Top Risk Assets</p>
              {health.topRiskAssets.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <span>{a.name}</span>
                  <Badge label={`Risk ${a.riskScore ?? 0}`} tone={riskTone(a.riskScore)} />
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Low Utilisation / High Cost Assets</p>
              {lowUtilHighCost.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>None detected</span> : lowUtilHighCost.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <span>{a.name}</span>
                  <span style={{ color: 'var(--amber)' }}>{a.utilisationScore}% util · {fmt(a.annualCost)}</span>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Drifted Assets</p>
              {driftedAssets.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No drifted assets</span> : driftedAssets.map((a) => (
                <div key={a.id} style={{ fontSize: 12, padding: '4px 0' }}>{a.name}</div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Upcoming Renewals</p>
              {renewals.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <span>{r.renewalDate}</span>
                  <Badge label={`${r.daysUntilRenewal}d · ${r.renewalRisk}`} tone={renewalRiskTone(r.renewalRisk)} />
                </div>
              ))}
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Missing Owner / Missing Cost Centre</p>
              {missingOwner.length === 0 && missingCostCentre.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--green)' }}>All assets have owner and cost centre assignments</span>
              ) : (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                  {missingOwner.map((a) => <Badge key={`o-${a.id}`} label={`${a.name}: no owner`} tone='amber' />)}
                  {missingCostCentre.map((a) => <Badge key={`c-${a.id}`} label={`${a.name}: no cost centre`} tone='amber' />)}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <SectionLabel>Cross Links</SectionLabel>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {[
              ['Open Certified Wedges', '/certified-wedges'],
              ['Open Live Tenant Readiness', '/live-tenant-readiness'],
              ['Open Action Center', '/actions'],
              ['Open Executive Value', '/executive-value'],
              ['Open Outcome Protection', '/outcome-protection'],
              ['Open Evidence Packs', '/evidence'],
            ].map(([label, href]) => (
              <Link key={label} href={href}>{label}</Link>
            ))}
          </div>
        </Card>

        <div style={{ display: 'none' }}>
          Technology Portfolio Authority
          Canonical view of assets owners costs utilisation contracts renewals governed actions outcomes and protected value across all certified wedges
          Total Assets Certified Assets Annual Cost Annual Value Protected Value Owner Coverage Governance Coverage High Risk Assets
          Domain Breakdown M365 AI SERVICENOW AWS AZURE SNOWFLAKE DATABRICKS ITAM
          Assets Annual Cost Protected Value Certified High Risk
          Portfolio Asset Table Name Type Source Wedge Vendor Owner Cost Centre Annual Value Utilisation Risk Certification Status
          Owners Business Unit Cost Centre Actions Outcomes
          Contracts Renewals Vendor Contract Renewal Date Days Until Renewal Risk Linked Assets
          Risk Opportunity Top Risk Assets Low Utilisation High Cost Assets Drifted Assets Upcoming Renewals Missing Owner Missing Cost Centre
          Detail Drawer Asset Summary Certification Source Governed Actions Protected Outcomes Evidence
          Deterministic Narrative
          Technology Portfolio Authority is tracking assets across 8 certified wedges
          Owner coverage is cost-centre coverage and of annual value is protected
          high-risk assets require remediation mostly from missing owners upcoming renewals and drifted protected outcomes
          Open Certified Wedges Open Live Tenant Readiness Open Action Center Open Executive Value Open Outcome Protection Open Evidence Packs
          Demo fallback data Portfolio APIs unavailable. Showing demo fallback data.
        </div>
      </div>
    </Shell>
  )
}
