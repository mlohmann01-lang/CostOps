import type { ReactNode, ElementType } from 'react'
import { Link } from 'wouter'
import { CheckCircle2, CircleAlert, CircleDollarSign, ClipboardList, FileText, ShieldCheck, Sparkles } from 'lucide-react'
import { Shell } from '../components/layout/Shell'
import { SectionLabel } from '../components/shared/Foundation'
import { usePilotWorkspaceData } from '../hooks/usePilotWorkspaceData'

type Tone = 'ready' | 'attention' | 'blocked' | 'value' | 'proof'

function formatMoney(value: number) {
  return `$${Math.round(Number(value ?? 0)).toLocaleString()}`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || 'Just now'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function toneFor(status: string): Tone {
  if (/Blocked/.test(status)) return 'blocked'
  if (/attention|Review/.test(status)) return 'attention'
  if (/Value/.test(status)) return 'value'
  if (/Evidence/.test(status)) return 'proof'
  return 'ready'
}

function Badge({ children, tone = 'ready' }: { children: ReactNode; tone?: Tone }) {
  const colors: Record<Tone, { background: string; border: string; color: string }> = {
    ready: { background: 'rgba(45, 212, 191, .12)', border: 'rgba(45, 212, 191, .35)', color: 'var(--teal)' },
    attention: { background: 'rgba(245, 158, 11, .12)', border: 'rgba(245, 158, 11, .35)', color: 'var(--amber)' },
    blocked: { background: 'rgba(248, 113, 113, .12)', border: 'rgba(248, 113, 113, .35)', color: 'var(--c-red-400)' },
    value: { background: 'rgba(96, 165, 250, .12)', border: 'rgba(96, 165, 250, .35)', color: '#93c5fd' },
    proof: { background: 'rgba(167, 139, 250, .12)', border: 'rgba(167, 139, 250, .35)', color: '#c4b5fd' },
  }
  const c = colors[tone]
  return <span style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${c.border}`, background: c.background, color: c.color, borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 600 }}>{children}</span>
}

function Card({ children, testId }: { children: ReactNode; testId?: string }) {
  return <section data-testid={testId} style={{ border: 'var(--border-default)', borderRadius: 14, background: 'var(--surface-0)', padding: 16 }}>{children}</section>
}

function KpiCard({ label, value, status, icon: Icon }: { label: string; value: string; status?: string; icon: ElementType }) {
  return <Card><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><SectionLabel>{label}</SectionLabel><Icon size={16} color='var(--text-tertiary)' /></div><strong style={{ display: 'block', marginTop: 8, fontSize: 22, color: 'var(--text-primary)' }}>{value}</strong>{status && <div style={{ marginTop: 10 }}><Badge tone={toneFor(status)}>{status}</Badge></div>}</Card>
}

function ReadinessRow({ item }: { item: any }) {
  return <Link href={item.href}><div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '12px 0', borderTop: 'var(--border-default)', color: 'inherit' }}><div><strong>{item.label}</strong><p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{item.detail}</p></div><Badge tone={toneFor(item.status)}>{item.status}</Badge></div></Link>
}

export default function PilotWorkspace() {
  const data = usePilotWorkspaceData()
  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <header style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
      <div>
        <SectionLabel>Customer success cockpit</SectionLabel>
        <h1 style={{ margin: '6px 0 8px', fontSize: 28 }}>Pilot Workspace</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 760 }}>One daily view for tenant status, trust, value, execution, evidence, and the next customer-success actions.</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Badge tone='proof'>{data.tenant.name}</Badge>
        <Badge tone={data.tenant.environment === 'LIVE' ? 'attention' : 'ready'}>{data.tenant.environment}</Badge>
        <Badge tone={toneFor(data.overallReadiness)}>{data.overallReadiness}</Badge>
        <Badge tone='value'>Updated {formatDate(data.tenant.lastUpdated)}</Badge>
      </div>
    </header>

    {data.sourceWarnings.length > 0 && <div style={{ border: '1px solid rgba(245, 158, 11, .35)', background: 'rgba(245, 158, 11, .08)', borderRadius: 12, padding: 12, color: 'var(--text-secondary)' }}>Some live sources need attention. The workspace is showing the best available operational data.</div>}

    <section data-testid='pilot-workspace-kpis' style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
      <KpiCard label='Tenant Status' value={data.kpis.tenantStatus} status={data.kpis.tenantStatus} icon={ClipboardList} />
      <KpiCard label='Trust Status' value={data.kpis.trustStatus} status={data.kpis.trustStatus} icon={ShieldCheck} />
      <KpiCard label='Projected Annual Value' value={formatMoney(data.kpis.projectedAnnualValue)} status='Value identified' icon={CircleDollarSign} />
      <KpiCard label='Verified Annual Value' value={formatMoney(data.kpis.verifiedAnnualValue)} status={data.kpis.verifiedAnnualValue ? 'Value verified' : 'Review required'} icon={CheckCircle2} />
      <KpiCard label='Open Actions' value={String(data.kpis.openActions)} status={data.kpis.openActions ? 'Needs attention' : 'Ready'} icon={CircleAlert} />
      <KpiCard label='Evidence Packs' value={String(data.kpis.evidencePacks)} status={data.kpis.evidencePacks ? 'Evidence ready' : 'Review required'} icon={FileText} />
    </section>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card testId='pilot-readiness'><SectionLabel>A. Pilot Readiness</SectionLabel><h2>Pilot Readiness</h2>{data.pilotReadiness.map((item: any) => <ReadinessRow key={item.label} item={item} />)}</Card>
      <Card testId='value-summary'><SectionLabel>B. Value Summary</SectionLabel><h2>Value Summary</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}><KpiCard label='Projected value' value={formatMoney(data.valueSummary.projectedAnnualValue)} status='Value identified' icon={CircleDollarSign} /><KpiCard label='Verified value' value={formatMoney(data.valueSummary.verifiedAnnualValue)} status={data.valueSummary.verifiedAnnualValue ? 'Value verified' : 'Review required'} icon={CheckCircle2} /><KpiCard label='Savings confidence' value={data.valueSummary.confidence} status={data.valueSummary.confidence} icon={Sparkles} /></div><p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.valueSummary.narrative}</p><Link href='/executive-value'>Open Executive Value Dashboard</Link></Card>
      <Card testId='execution-control'><SectionLabel>C. Execution Control</SectionLabel><h2>Execution Control</h2><div style={{ display: 'grid', gap: 10 }}>{[['Pending approvals', data.executionControl.pendingApprovals, data.executionControl.pendingApprovals ? 'Review required' : 'Ready'], ['Dry-run status', data.executionControl.dryRunStatus, data.executionControl.dryRunStatus], ['Controlled execution', data.executionControl.controlledExecutionStatus, data.executionControl.controlledExecutionStatus], ['Blocked actions', data.executionControl.blockedActions, data.executionControl.blockedActions ? 'Blocked' : 'Ready'], ['Verification status', data.executionControl.verificationStatus, data.executionControl.verificationStatus]].map(([label, value, status]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderTop: 'var(--border-default)', paddingTop: 10 }}><span>{label}</span><strong>{String(value)}</strong><Badge tone={toneFor(String(status))}>{String(status)}</Badge></div>)}</div></Card>
      <Card testId='evidence-proof'><SectionLabel>D. Evidence & Proof</SectionLabel><h2>Evidence & Proof</h2><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}><Badge tone={toneFor(data.evidenceProof.proofStatus)}>{data.evidenceProof.proofStatus}</Badge><Badge tone='proof'>{data.evidenceProof.exportAvailability}</Badge><Badge tone={toneFor(data.evidenceProof.executiveReviewReadiness)}>{data.evidenceProof.executiveReviewReadiness}</Badge></div>{data.evidenceProof.packs.length ? data.evidenceProof.packs.map((pack: any) => <div key={pack.evidencePackId} style={{ borderTop: 'var(--border-default)', padding: '10px 0' }}><strong>{pack.evidencePackId}</strong><p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>{pack.scope} · {pack.status} · {pack.metrics?.completeness ?? 0}% complete</p></div>) : <p style={{ color: 'var(--text-secondary)' }}>Generate an evidence pack when pilot proof is ready.</p>}<Link href='/evidence-packs'>Open Evidence Packs</Link></Card>
    </div>

    <Card testId='pilot-open-actions'><SectionLabel>E. Open Actions</SectionLabel><h2>Open Actions</h2><div style={{ display: 'grid', gap: 10 }}>{data.openActions.map((item) => <Link key={item.id} href={item.href}><div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 12, borderTop: 'var(--border-default)', padding: '12px 0', color: 'inherit' }}><div><strong>{item.label}</strong><p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{item.reason}</p></div><Badge tone={toneFor(item.status)}>{item.status}</Badge><Badge tone={item.priority === 'High' ? 'blocked' : item.priority === 'Medium' ? 'attention' : 'ready'}>{item.priority}</Badge></div></Link>)}</div></Card>
  </div></Shell>
}
