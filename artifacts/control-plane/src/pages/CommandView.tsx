import React, { useState } from 'react'
import { useLocation } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { EmptyState, MetricCard, StatusPill, ActionButton, SectionLabel, LiveDataError } from '../components/shared/Foundation'
import { RuntimeActivityList } from '../components/shared/RuntimeActivityList'
import { useCommandData } from '../hooks/useCommandData'
import { useRuntimeEvents } from '../hooks/useRuntimeEvents'
import { simulateApprove, simulateSubmitForApproval } from '../lib/demoRuntimeStore'
import { useWorkspace } from '../lib/workspaceContext'
import { submitRecommendationForApproval, broadcastLiveReadRefresh } from '../lib/recommendationApprovalBridge'

function money(v: number) { return v >= 1000 ? `$${Math.round(v/1000)}k` : `$${v.toLocaleString()}` }
export function proofSteps() { return ['Telemetry validated','Cost model applied','Blast radius assessed','Policy gate cleared'] }


function verdictStatus(verdict: string) {
  if (verdict === 'approved') return 'approved'
  if (verdict === 'verified') return 'verified'
  if (verdict === 'approval-required') return 'approval-required'
  return verdict
}

export default function CommandView({ params }: { params?: { domain?: string } }) {
  const workspace = useWorkspace(); const [, navigate] = useLocation(); const { data, isEmptyLive, error, refresh } = useCommandData(); const { latestEvents, error: activityError } = useRuntimeEvents(); const [expanded, setExpanded] = useState<string | null>(null); const [notice, setNotice] = useState(''); const [submitError, setSubmitError] = useState(''); const [pendingSubmit, setPendingSubmit] = useState<string | null>(null)
  const domain = params?.domain ?? 'all'
  const actions = domain === 'all' ? data.actions : data.actions.filter((a:any) => a.domain === domain)
  const connectors: any[] = [{ id:'all', name:'all', domain:'all', description:'all', iconType:'saas', readiness:'DEGRADED', enabled:true, lastSyncAt:null, evidenceSources:[] }]
  const submitApproval = async (actionId: string) => {
    setPendingSubmit(actionId); setNotice(''); setSubmitError('')
    try {
      await submitRecommendationForApproval(actionId, { reason: 'Operator submitted from Command' })
      setNotice('Approval workflow created')
      broadcastLiveReadRefresh()
      await refresh()
    } catch (err) {
      setSubmitError(`Live data unavailable: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setPendingSubmit(null) }
  }

  return <Shell><div style={{padding:'16px 20px'}}><h1>Command</h1>{notice && <div role='status' style={{border:'var(--border-default)',padding:8}}>{notice}</div>}{submitError && <div role='alert' style={{border:'var(--border-default)',padding:8}}>{submitError}</div>}<DomainTabs connectors={connectors} currentDomain={'all' as any} basePath='/:domain/command' />
    {!isEmptyLive && <div data-testid='posture-strip' style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,margin:'12px 0'}}>{data.posture.map((p:any)=><button key={p.id} onClick={()=>navigate(p.href)} style={{textAlign:'left',border:'var(--border-default)',background:'var(--bg-card)',padding:10}}><div style={{fontSize:11,color:'var(--text-label)'}}>{p.label}</div><div style={{color:(p as any).tone === 'green' ? 'var(--green)' : 'var(--amber)'}}>{p.value}</div></button>)}</div>}

    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <MetricCard label='Total identified' value={isEmptyLive?'--':money(data.metrics.totalIdentified)} /> <span>→</span>
      <MetricCard label='Eligible now' value={isEmptyLive?'--':money(data.metrics.eligibleNow)} delta='44% of identified' hero /> <span>→</span>
      <MetricCard label='Pending approval' value={isEmptyLive?'--':money(data.metrics.pendingApproval)} delta='awaiting approval · 30% of identified' /> <span>→</span>
      <MetricCard label='Blocked / manual' value={isEmptyLive?'--':money(data.metrics.blockedManual)} />
    </div>

    {isEmptyLive ? <EmptyState title='No actions identified yet' description='Connect your first data source to begin discovering optimisation opportunities.' ctaLabel='Connect data source →' /> : (
      <div>{error && <LiveDataError error={error} onRetry={refresh} />}<section data-testid='command-live-activity' style={{border:'var(--border-default)',borderRadius:10,padding:12,marginTop:16,background:'var(--bg-card)'}}><SectionLabel>Live activity</SectionLabel><RuntimeActivityList events={latestEvents} limit={5} compact emptyLabel={activityError ? 'Runtime activity unavailable' : 'No runtime activity yet'} /></section>
      <div style={{display:'grid',gridTemplateColumns:'1fr 90px 150px 90px 80px 150px',marginTop:16}}><b>Action</b><b>Saving</b><b>Verdict</b><b>Blast</b><b>Rollback</b><b></b></div>
      {actions.map((a:any)=><div key={a.id}><div style={{display:'grid',gridTemplateColumns:'1fr 90px 150px 90px 80px 150px',padding:'8px 0',borderTop:'var(--border-default)'}} onClick={()=>setExpanded(expanded===a.id?null:a.id)}><span>{a.action}</span><span>{money(a.saving)}</span><StatusPill status={verdictStatus(a.verdict) as any} /><span>{a.blast}</span><span>{a.rollback}</span>{workspace.mode === 'demo' ? (a.verdict==='approval-required'?<ActionButton variant='approve' onClick={()=>simulateApprove(a.id)} />:<ActionButton variant={a.verdict==='eligible'?'approve':'review'} onClick={()=>a.verdict==='eligible'?simulateSubmitForApproval(a.id):setExpanded(a.id)} />) : a.approvalWorkflowId ? <button disabled>Approval pending</button> : a.verdict === 'approval-required' ? <button disabled={pendingSubmit===a.id} onClick={(event)=>{event.stopPropagation(); void submitApproval(a.id)}}>{pendingSubmit===a.id?'Submitting…':'Submit for approval'}</button> : <button onClick={(event)=>{event.stopPropagation(); setExpanded(a.id)}}>Review</button>}</div>
      {expanded===a.id && <div data-testid='proof-chain' style={{padding:10,border:'var(--border-default)',marginBottom:6}}>{proofSteps().map((s,i)=><div key={s}>✓ {s} · hash-{i+1}a2b3c · Cert ID GEC-2026-05-2{i}</div>)}<a>View full evidence →</a></div>}</div>)}
      <h3 style={{marginTop:16}}>Priority actions</h3><div>{data.priority.map((p:any)=><div key={p.id} style={{borderLeft:'3px solid var(--amber)',padding:'8px 10px',marginBottom:6,background:'var(--bg-card)'}}>{p.text} <a onClick={()=>navigate(p.href)}>Resolve →</a></div>)}</div></div>
    )}
  </div></Shell>
}
