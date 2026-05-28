import React, { useState } from 'react'
import { useLocation } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { EmptyState, MetricCard, StatusPill, ActionButton } from '../components/shared/Foundation'
import { useCommandData } from '../hooks/useCommandData'

function money(v: number) { return v >= 1000 ? `$${Math.round(v/1000)}k` : `$${v.toLocaleString()}` }
export function proofSteps() { return ['Telemetry validated','Cost model applied','Blast radius assessed','Policy gate cleared'] }

export default function CommandView({ params }: { params?: { domain?: string } }) {
  const [, navigate] = useLocation(); const { data, isEmptyLive } = useCommandData(); const [expanded, setExpanded] = useState<string | null>(null)
  const domain = params?.domain ?? 'all'
  const actions = domain === 'all' ? data.actions : data.actions.filter(a => a.domain === domain)
  const connectors: any[] = [{ id:'all', name:'all', domain:'all', description:'all', iconType:'saas', readiness:'DEGRADED', enabled:true, lastSyncAt:null, evidenceSources:[] }]

  return <Shell><div style={{padding:'16px 20px'}}><h1>Command</h1><DomainTabs connectors={connectors} currentDomain={'all' as any} basePath='/:domain/command' />
    {!isEmptyLive && <div data-testid='posture-strip' style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,margin:'12px 0'}}>{data.posture.map(p=><button key={p.id} onClick={()=>navigate(p.href)} style={{textAlign:'left',border:'var(--border-default)',background:'var(--bg-card)',padding:10}}><div style={{fontSize:11,color:'var(--text-label)'}}>{p.label}</div><div style={{color:'var(--amber)'}}>{p.value}</div></button>)}</div>}

    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <MetricCard label='Total identified' value={isEmptyLive?'--':money(data.metrics.totalIdentified)} /> <span>→</span>
      <MetricCard label='Eligible now' value={isEmptyLive?'--':money(data.metrics.eligibleNow)} delta='44% of identified' hero /> <span>→</span>
      <MetricCard label='Pending approval' value={isEmptyLive?'--':money(data.metrics.pendingApproval)} delta='awaiting approval · 30% of identified' /> <span>→</span>
      <MetricCard label='Blocked / manual' value={isEmptyLive?'--':money(data.metrics.blockedManual)} />
    </div>

    {isEmptyLive ? <EmptyState title='No actions identified yet' description='Connect your first data source to begin discovering optimisation opportunities.' ctaLabel='Connect data source →' /> : (
      <div><div style={{display:'grid',gridTemplateColumns:'1fr 90px 130px 90px 80px 120px',marginTop:16}}><b>Action</b><b>Saving</b><b>Verdict</b><b>Blast</b><b>Rollback</b><b></b></div>
      {actions.map(a=><div key={a.id}><div style={{display:'grid',gridTemplateColumns:'1fr 90px 130px 90px 80px 120px',padding:'8px 0',borderTop:'var(--border-default)'}} onClick={()=>setExpanded(expanded===a.id?null:a.id)}><span>{a.action}</span><span>{money(a.saving)}</span><StatusPill status={a.verdict as any} /><span>{a.blast}</span><span>{a.rollback}</span><ActionButton variant={a.verdict==='approval-required'?'review':'approve'} /></div>
      {expanded===a.id && <div data-testid='proof-chain' style={{padding:10,border:'var(--border-default)',marginBottom:6}}>{proofSteps().map((s,i)=><div key={s}>✓ {s} · hash-{i+1}a2b3c · Cert ID GEC-2026-05-2{i}</div>)}<a>View full evidence →</a></div>}</div>)}
      <h3 style={{marginTop:16}}>Priority actions</h3><div>{data.priority.map(p=><div key={p.id} style={{borderLeft:'3px solid var(--amber)',padding:'8px 10px',marginBottom:6,background:'var(--bg-card)'}}>{p.text} <a onClick={()=>navigate(p.href)}>Resolve →</a></div>)}</div></div>
    )}
  </div></Shell>
}
