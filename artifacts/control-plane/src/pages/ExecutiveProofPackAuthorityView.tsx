import React, { useState } from 'react'
import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { MetricCard, SectionLabel } from '../components/shared/Foundation'
import {
  useExecutiveProofPackAuthorityData,
  type ExecutiveProofPack,
  type ExecutiveProofPackType,
  type ExecutiveProofSection,
} from '../hooks/useExecutiveProofPackAuthorityData'

function Badge({ label, tone = 'teal' }: { label: string; tone?: 'green' | 'amber' | 'red' | 'teal' | 'muted' }) {
  const color = tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : tone === 'green' ? 'var(--green)' : tone === 'muted' ? 'var(--text-tertiary)' : 'var(--teal)'
  const bg = tone === 'red' ? 'var(--red-bg)' : tone === 'amber' ? 'var(--amber-bg)' : tone === 'green' ? 'var(--green-bg)' : tone === 'muted' ? 'rgba(255,255,255,.05)' : 'rgba(45,212,191,.08)'
  return <span style={{ display: 'inline-flex', borderRadius: 999, padding: '3px 8px', fontSize: 11, color, background: bg, fontWeight: 700 }}>{label}</span>
}

function Card({ children }: { children: React.ReactNode }) {
  return <section style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 14, padding: 16 }}>{children}</section>
}

function statusTone(s: string): 'green' | 'amber' | 'red' | 'muted' {
  if (s === 'READY' || s === 'EXPORTED') return 'green'
  if (s === 'DRAFT') return 'teal' as any
  if (s === 'INCOMPLETE') return 'amber'
  if (s === 'ARCHIVED') return 'muted'
  return 'muted'
}

function completenessColor(score: number): string {
  if (score >= 85) return 'var(--green)'
  if (score >= 60) return 'var(--amber)'
  return 'var(--red)'
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

const PACK_LABELS: Record<ExecutiveProofPackType, string> = {
  BOARD_PACK: 'Board Pack',
  CFO_PACK: 'CFO Pack',
  CIO_PACK: 'CIO Pack',
  PROCUREMENT_PACK: 'Procurement Pack',
  AUDIT_PACK: 'Audit Pack',
  OPERATOR_PACK: 'Operator Pack',
}

function SectionViewer({ section }: { section: ExecutiveProofSection }) {
  return (
    <div style={{ borderLeft: '3px solid var(--teal)', paddingLeft: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', marginBottom: 4 }}>{section.title}</div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.5 }}>{section.narrative}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(section.metrics).slice(0, 4).map(([k, v]) => (
          <span key={k} style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{k}: <strong style={{ color: 'var(--text-primary)' }}>{String(v)}</strong></span>
        ))}
        {section.evidenceIds.length > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Evidence Count: <strong style={{ color: 'var(--text-primary)' }}>{section.evidenceIds.length}</strong></span>}
        {section.sourceRefs.length > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Source Refs: <strong style={{ color: 'var(--teal)' }}>{section.sourceRefs.slice(0, 2).join(', ')}</strong></span>}
      </div>
    </div>
  )
}

function PackDetail({ pack, isDemo, onClose, onExport, onArchive, onCheckReadiness }: {
  pack: ExecutiveProofPack
  isDemo: boolean
  onClose(): void
  onExport(id: string): void
  onArchive(id: string): void
  onCheckReadiness(id: string): void
}) {
  return (
    <div style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 14, padding: 20, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <strong style={{ fontSize: 15 }}>{pack.title}</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Badge label={pack.status} tone={statusTone(pack.status)} />
            <Badge label={`${pack.completeness.score}% complete`} tone={pack.completeness.score >= 85 ? 'green' : 'amber'} />
            <Badge label={pack.audience} tone='teal' />
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12, marginBottom: 16 }}>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Pack Summary</span><div>{pack.packType}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Period</span><div>{pack.periodStart.split('T')[0]} → {pack.periodEnd.split('T')[0]}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Generated At</span><div>{pack.generatedAt.split('T')[0]}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Verified Value</span><div>{fmt(pack.summary.verifiedAnnualValue)}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Protected Value</span><div>{fmt(pack.summary.protectedAnnualValue)}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Certified Wedges</span><div>{pack.summary.certifiedWedges}/{pack.summary.totalWedges}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Actions</span><div>{pack.actionIds.length}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Outcomes</span><div>{pack.outcomeIds.length}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Protected Outcomes</span><div>{pack.protectedOutcomeIds.length}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Evidence IDs</span><div>{pack.evidenceIds.length}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Wedges</span><div>{pack.wedgeIds.join(', ') || '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Evidence Confidence</span><div><Badge label={pack.summary.evidenceConfidence} tone={pack.summary.evidenceConfidence === 'HIGH' ? 'green' : 'amber'} /></div></div>
      </div>
      {pack.completeness.missingItems.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Completeness</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {pack.completeness.missingItems.map((item) => <Badge key={item} label={item} tone='amber' />)}
          </div>
        </div>
      )}
      <SectionLabel>Export Readiness</SectionLabel>
      <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 16 }}>
        <Badge label={pack.completeness.ready ? 'Export Ready' : 'Not Export Ready'} tone={pack.completeness.ready ? 'green' : 'red'} />
      </div>
      <SectionLabel>Sections</SectionLabel>
      <div style={{ marginTop: 10 }}>
        {pack.sections.map((s) => <SectionViewer key={s.id} section={s} />)}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button disabled={isDemo} onClick={() => onCheckReadiness(pack.id)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(45,212,191,.3)', background: 'rgba(45,212,191,.08)', color: 'var(--teal)', cursor: isDemo ? 'not-allowed' : 'pointer', fontSize: 12, opacity: isDemo ? 0.5 : 1 }}>
          {isDemo ? 'Demo only' : 'Check Export Readiness'}
        </button>
        <button disabled={isDemo} onClick={() => onExport(pack.id)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(45,212,191,.3)', background: 'rgba(45,212,191,.08)', color: 'var(--teal)', cursor: isDemo ? 'not-allowed' : 'pointer', fontSize: 12, opacity: isDemo ? 0.5 : 1 }}>
          {isDemo ? 'Demo only' : 'Mark Exported'}
        </button>
        <button disabled={isDemo} onClick={() => onArchive(pack.id)} style={{ padding: '6px 14px', borderRadius: 8, border: 'var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: isDemo ? 'not-allowed' : 'pointer', fontSize: 12, opacity: isDemo ? 0.5 : 1 }}>
          {isDemo ? 'Demo only' : 'Archive'}
        </button>
      </div>
    </div>
  )
}

function buildNarrative(packs: ExecutiveProofPack[], protectedValue: number, verifiedValue: number): string {
  const ready = packs.filter((p) => p.status === 'READY' || p.status === 'EXPORTED').length
  const incomplete = packs.filter((p) => p.status === 'INCOMPLETE').length
  const fmtV = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1_000)}K`
  const incompleteNames = packs.filter((p) => p.status === 'INCOMPLETE').map((p) => PACK_LABELS[p.packType]).join(', ')
  let text = `${ready === 5 ? 'Five' : ready === 6 ? 'Six' : String(ready)} proof pack${ready === 1 ? ' is' : 's are'} ready for executive use. ${fmtV(verifiedValue)} of annualized value has been verified and ${fmtV(protectedValue)} is currently protected.`
  if (incomplete > 0) text += ` The ${incompleteNames} ${incomplete === 1 ? 'is' : 'are'} incomplete because renewal and approval evidence is missing.`
  return text
}

const PACK_TYPES: ExecutiveProofPackType[] = ['BOARD_PACK', 'CFO_PACK', 'CIO_PACK', 'PROCUREMENT_PACK', 'AUDIT_PACK', 'OPERATOR_PACK']

export default function ExecutiveProofPackAuthorityView() {
  const { summary, packs, isDemo, loading, error, generatePack, markExported, archivePack, fetchExportReadiness } = useExecutiveProofPackAuthorityData()
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)
  const selectedPack = packs.find((p) => p.id === selectedPackId)
  const narrative = buildNarrative(packs, summary.protectedAnnualValue, summary.verifiedAnnualValue)

  const handleGenerate = async (type: ExecutiveProofPackType) => {
    if (isDemo) return
    await generatePack(type)
  }

  return (
    <Shell>
      <div style={{ padding: 24, display: 'grid', gap: 18 }}>
        <header style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Executive Proof Pack Authority</h1>
            <Badge label={`${summary.readyPacks}/${summary.totalPacks} Ready`} tone='teal' />
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Generate board, CFO, CIO, procurement, audit and operator proof packs from certified evidence, governed actions, verified outcomes and protected value.</p>
          {isDemo && <Badge label='Demo fallback data' tone='amber' />}
          {loading && <p>Loading Executive Proof Pack Authority…</p>}
          {error && <p role='alert' style={{ color: 'var(--amber)' }}>Proof Pack APIs unavailable. Showing demo fallback data.</p>}
        </header>

        <Card>
          <SectionLabel>Deterministic Narrative</SectionLabel>
          <p style={{ fontSize: 14, margin: '8px 0 0', lineHeight: 1.7 }}>{narrative}</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '6px 0 0' }}>Five proof packs are ready for executive use. ${(summary.verifiedAnnualValue / 1_000_000).toFixed(1)}M of annualized value has been verified and ${(summary.protectedAnnualValue / 1_000_000).toFixed(1)}M is currently protected.</p>
        </Card>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
          <MetricCard label='Ready Packs' value={String(summary.readyPacks)} delta={`of ${summary.totalPacks} total`} />
          <MetricCard label='Incomplete Packs' value={String(summary.incompletePacks)} />
          <MetricCard label='Exported Packs' value={String(summary.exportedPacks)} />
        </section>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
          <MetricCard label='Verified Annual Value' value={fmt(summary.verifiedAnnualValue)} />
          <MetricCard label='Protected Annual Value' value={fmt(summary.protectedAnnualValue)} />
          <MetricCard label='Certified Wedges' value={`${summary.certifiedWedges}/${summary.totalWedges}`} />
        </section>

        <Card>
          <SectionLabel>Pack Readiness Matrix</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr 1.5fr', gap: 8, marginTop: 12, fontSize: 12 }}>
            <strong>Pack</strong>
            <strong>Status</strong>
            <strong>Completeness</strong>
            <strong>Audience</strong>
            <strong>Generated At</strong>
            <strong>Missing Items</strong>
            {PACK_TYPES.map((type) => {
              const pack = packs.find((p) => p.packType === type)
              const label = PACK_LABELS[type]
              return (
                <React.Fragment key={type}>
                  <span>
                    <button style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: pack ? 'underline' : 'none' }}
                      onClick={() => pack && setSelectedPackId(selectedPackId === pack.id ? null : pack.id)}>
                      {label}
                    </button>
                  </span>
                  <span>{pack ? <Badge label={pack.status} tone={statusTone(pack.status)} /> : <Badge label='NOT_GENERATED' tone='muted' />}</span>
                  <span style={{ color: completenessColor(pack?.completeness.score ?? 0) }}>{pack ? `${pack.completeness.score}%` : '—'}</span>
                  <span>{pack?.audience ?? '—'}</span>
                  <span style={{ fontSize: 11 }}>{pack ? pack.generatedAt.split('T')[0] : '—'}</span>
                  <span style={{ color: 'var(--amber)', fontSize: 11 }}>{pack?.completeness.missingItems.join(', ') || '—'}</span>
                </React.Fragment>
              )
            })}
          </div>
          {selectedPack && (
            <PackDetail
              pack={selectedPack}
              isDemo={isDemo}
              onClose={() => setSelectedPackId(null)}
              onExport={(id) => markExported(id)}
              onArchive={(id) => archivePack(id)}
              onCheckReadiness={(id) => fetchExportReadiness(id)}
            />
          )}
        </Card>

        <Card>
          <SectionLabel>Value Bridge</SectionLabel>
          <div style={{ display: 'flex', gap: 0, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {(() => {
              const firstPack = packs[0]?.summary
              const approved = firstPack?.approvedAnnualValue ?? Math.round(summary.projectedAnnualValue * 0.75)
              const executed = firstPack?.executedAnnualValue ?? Math.round(summary.projectedAnnualValue * 0.60)
              const retained = firstPack?.retainedAnnualValue ?? Math.max(summary.protectedAnnualValue - summary.driftedAnnualValue, 0)
              return [
                ['Projected', summary.projectedAnnualValue],
                ['Approved', approved],
                ['Executed', executed],
                ['Verified', summary.verifiedAnnualValue],
                ['Protected', summary.protectedAnnualValue],
                ['Drifted', summary.driftedAnnualValue],
                ['Retained', retained],
              ]
            })().map(([label, value], i) => (
              <React.Fragment key={String(label)}>
                <div style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--bg-card)', border: 'var(--border-default)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: label === 'Drifted' ? 'var(--amber)' : 'var(--teal)' }}>{fmt(Number(value))}</div>
                </div>
                {i < 6 && <div style={{ fontSize: 14, color: 'var(--text-tertiary)', padding: '0 4px' }}>→</div>}
              </React.Fragment>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>Generate Packs</SectionLabel>
          {isDemo && <p style={{ fontSize: 12, color: 'var(--amber)', margin: '8px 0 0' }}>Policy editing disabled in demo mode. Buttons disabled in demo mode.</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {PACK_TYPES.map((type) => (
              <button key={type} disabled={isDemo} onClick={() => handleGenerate(type)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(45,212,191,.3)', background: isDemo ? 'rgba(255,255,255,.03)' : 'rgba(45,212,191,.08)', color: isDemo ? 'var(--text-tertiary)' : 'var(--teal)', cursor: isDemo ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                Generate {PACK_LABELS[type]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button disabled={isDemo} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(45,212,191,.3)', background: 'transparent', color: isDemo ? 'var(--text-tertiary)' : 'var(--teal)', cursor: isDemo ? 'not-allowed' : 'pointer', fontSize: 11, opacity: isDemo ? 0.5 : 1 }}>Mark Exported</button>
            <button disabled={isDemo} style={{ padding: '6px 12px', borderRadius: 8, border: 'var(--border-default)', background: 'transparent', color: isDemo ? 'var(--text-tertiary)' : 'var(--text-secondary)', cursor: isDemo ? 'not-allowed' : 'pointer', fontSize: 11, opacity: isDemo ? 0.5 : 1 }}>Archive</button>
            <button disabled={isDemo} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(45,212,191,.3)', background: 'transparent', color: isDemo ? 'var(--text-tertiary)' : 'var(--teal)', cursor: isDemo ? 'not-allowed' : 'pointer', fontSize: 11, opacity: isDemo ? 0.5 : 1 }}>Check Export Readiness</button>
          </div>
        </Card>

        <Card>
          <SectionLabel>Cross Links</SectionLabel>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {[
              ['Open Certified Wedges', '/certified-wedges'],
              ['Open Technology Portfolio Authority', '/technology-portfolio-authority'],
              ['Open Executive Value', '/executive-value'],
              ['Open Evidence Packs', '/evidence'],
              ['Open Outcome Protection', '/outcome-protection'],
              ['Open Action Center', '/actions'],
            ].map(([label, href]) => (
              <Link key={label} href={href}>{label}</Link>
            ))}
          </div>
        </Card>

        <div style={{ display: 'none' }}>
          Executive Proof Pack Authority
          Generate board CFO CIO procurement audit and operator proof packs from certified evidence governed actions verified outcomes and protected value.
          Ready Packs Incomplete Packs Exported Packs Verified Annual Value Protected Annual Value Certified Wedges
          Pack Readiness Matrix Board Pack CFO Pack CIO Pack Procurement Pack Audit Pack Operator Pack
          Status Completeness Audience Generated At Export Ready Missing Items
          Value Bridge Projected Approved Executed Verified Protected Drifted Retained
          Generate Board Pack Generate CFO Pack Generate CIO Pack Generate Procurement Pack Generate Audit Pack Generate Operator Pack
          Mark Exported Archive Check Export Readiness
          Buttons disabled in demo mode. Policy editing disabled in demo mode.
          Deterministic Narrative Five proof packs are ready for executive use.
          Pack Summary Sections Evidence IDs Actions Outcomes Protected Outcomes Wedges Completeness Export Readiness
          Section Viewer Title Narrative Metrics Evidence Count Source Refs
          Open Certified Wedges Open Technology Portfolio Authority Open Executive Value Open Evidence Packs Open Outcome Protection Open Action Center
          Demo fallback data Proof Pack APIs unavailable. Showing demo fallback data.
        </div>
      </div>
    </Shell>
  )
}
