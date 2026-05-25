import { useEffect, useMemo, useState } from 'react'
import { Terminal } from 'lucide-react'
import { useRuntimeSummary } from '../../lib/operations/operation-store'

const QUERIES = [
  'What is my biggest saving opportunity?',
  'Show blocked savings',
  'What needs approval?',
  'What changed today?',
  'Why is AWS degraded?',
  'Show unverified savings',
]

export function CommandBar() {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [focused, setFocused] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const runtime = useRuntimeSummary()
  const replyFor = (query: string) => {
    const map: Record<string, string> = {
      'What is my biggest saving opportunity?': 'Biggest opportunity: reclaim inactive M365 E3 licences (~$42,840/mo). Open Command for approval state.',
      'Show blocked savings': 'Blocked savings are policy- or readiness-gated until governance blockers are cleared.',
      'What needs approval?': `Approval queue is active. ${runtime.approvedCount} actions have been approved in this session.`,
      'What changed today?': `Today: ${runtime.approvedCount} approvals, ${runtime.executionCompletedCount} completed executions, ${runtime.verificationPendingCount} pending verification updates, ${runtime.connectorIssuesCount} connector issues.`,
      'Show drift risks': 'Drift risks are highest in cloud commitments and stale connector evidence windows.',
      'Why is this action eligible?': 'Eligibility requires policy pass, rollback feasibility, and trusted evidence freshness.',
      'Show unverified savings': 'Unverified savings are queued/pending-verification execution outcomes.',
      'Why is AWS degraded?': 'AWS is degraded because evidence freshness is outside policy threshold and credential rotation is required.',
    }
    return map[query] ?? 'Ask Certen beta — guided answers — guided answers only. Supported prompts are shown above.'
  }
  useEffect(() => { const id = window.setInterval(() => setPlaceholderIndex(x => (x + 1) % QUERIES.length), 3500); return () => window.clearInterval(id) }, [])
  const rotatingPlaceholder = QUERIES[placeholderIndex]
  const suggestions = useMemo(() => QUERIES.filter(x => x.toLowerCase().includes(q.toLowerCase())), [q])
  return (
    <div style={{ padding: '10px 20px', borderTop: '0.5px solid var(--border-subtle)', background: 'var(--surface-0)', flexShrink: 0 }}>
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <Terminal size={15} color="var(--text-tertiary)" />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ask Certen beta — guided answers</span>
      </div>
      <input value={q} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} onChange={e=>setQ(e.target.value)} placeholder={q ? 'Ask a guided question…' : rotatingPlaceholder} style={{ width:'100%', marginTop:8, fontSize:12 }} />
      {(q || focused) && <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:6 }}>{suggestions.map(s => <button key={s} onClick={()=>{setQ(s); setAnswer(replyFor(s))}} style={{fontSize:11}}>{s}</button>)}</div>}
      {q && !suggestions.includes(q) && <button onClick={() => setAnswer(replyFor(q))} style={{ marginTop: 8, fontSize: 11 }}>Run guided check</button>}
      {answer && <div style={{ marginTop:8, fontSize:11, color:'var(--text-secondary)' }}>{answer}</div>}
    </div>
  )
}
