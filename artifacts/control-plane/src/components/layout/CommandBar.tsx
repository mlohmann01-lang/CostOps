import { useMemo, useState } from 'react'
import { Terminal } from 'lucide-react'
import { useRuntimeSummary } from '../../lib/operations/operation-store'

const QUERIES = [
  'What is my biggest saving opportunity?',
  'What is blocked?',
  'What needs approval?',
  'What changed today?',
  'Show drift risks',
  'Why is this action eligible?',
  'Show unverified savings',
  'Show connector issues',
]

export function CommandBar() {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [focused, setFocused] = useState(false)
  const runtime = useRuntimeSummary()
  const replyFor = (query: string) => {
    const map: Record<string, string> = {
      'What is my biggest saving opportunity?': 'Biggest opportunity: reclaim inactive M365 E3 licences (~$42,840/mo). Open Command for approval state.',
      'What is blocked?': 'Blocked: ServiceNow CMDB sync decommission is manual-only until connector setup is complete.',
      'What needs approval?': `Approval queue is active. ${runtime.approvedCount} actions have been approved in this session.`,
      'What changed today?': `Today: ${runtime.approvedCount} approvals, ${runtime.executionCompletedCount} completed executions, ${runtime.verificationPendingCount} pending verification updates, ${runtime.connectorIssuesCount} connector issues.`,
      'Show drift risks': 'Drift risks are highest in cloud commitments and stale connector evidence windows.',
      'Why is this action eligible?': 'Eligibility requires policy pass, rollback feasibility, and trusted evidence freshness.',
      'Show unverified savings': 'Unverified savings are queued/pending-verification execution outcomes.',
      'Show connector issues': 'Connector issues: degraded AWS signal freshness; ServiceNow/Flexera are not configured.',
    }
    return map[query] ?? 'Ask Certen beta — guided answers only. Supported prompts are shown above.'
  }
  const suggestions = useMemo(() => QUERIES.filter(x => x.toLowerCase().includes(q.toLowerCase())), [q])
  return (
    <div style={{ padding: '10px 20px', borderTop: '0.5px solid var(--border-subtle)', background: 'var(--surface-0)', flexShrink: 0 }}>
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <Terminal size={15} color="var(--text-tertiary)" />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ask Certen beta</span>
      </div>
      <input value={q} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} onChange={e=>setQ(e.target.value)} placeholder='Ask a guided question…' style={{ width:'100%', marginTop:8, fontSize:12 }} />
      {(q || focused) && <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:6 }}>{suggestions.map(s => <button key={s} onClick={()=>{setQ(s); setAnswer(replyFor(s))}} style={{fontSize:11}}>{s}</button>)}</div>}
      {q && !suggestions.includes(q) && <button onClick={() => setAnswer(replyFor(q))} style={{ marginTop: 8, fontSize: 11 }}>Run guided check</button>}
      {answer && <div style={{ marginTop:8, fontSize:11, color:'var(--text-secondary)' }}>{answer}</div>}
    </div>
  )
}
