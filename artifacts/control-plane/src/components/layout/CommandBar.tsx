import { useEffect, useMemo, useState } from 'react'
import { Terminal } from 'lucide-react'
import { useLocation } from 'wouter'
import { useRuntimeSummary } from '../../lib/operations/operation-store'

const QUERIES = ['What changed today?','Where is drift increasing?','What is my highest-confidence saving opportunity?','Which actions are blocked?','What is awaiting verification?','Which connectors need attention?','How would Flexera improve confidence?','Are there entitlement mismatches?','Which recommendations need authority evidence?','What evidence is missing from Flexera?','Why is confidence 91%?','What would improve authority coverage?','Why is this blocked?','Where is drift stability weakest?']

export function CommandBar() {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState<any>(null)
  const [focused, setFocused] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [, nav] = useLocation()
  const runtime = useRuntimeSummary()
  const replyFor = (query: string) => ({
    summary: query === 'What changed today?' ? `Approvals ${runtime.approvedCount}, executions ${runtime.executionCompletedCount}, pending verification ${runtime.verificationPendingCount}.` : query.includes('Flexera') || query.includes('entitlement') ? 'Flexera acts as entitlement authority. In this workspace it is demo authority evidence (synthetic) unless configured.' : 'Narrative insight generated from synthetic demo telemetry.',
    affectedDomain: query.includes('connectors') ? 'Cloud' : 'AI/SaaS',
    affectedConnector: query.includes('connectors') ? 'AWS' : 'OpenAI + M365',
    nextAction: query.includes('blocked') ? 'Open Governance and clear readiness blockers.' : query.includes('authority coverage') ? 'Configure Flexera authority evidence and reconcile entitlement exports.' : 'Review recommendation details and continue governed simulation.',
    confidence: query.includes('confidence 91') ? '91% (Flexera authority-adjusted)' : query.includes('highest-confidence') ? '96%' : '82%',
    verificationStatus: runtime.verificationPendingCount > 0 ? 'Verification pending' : 'Verified',
    jump: query.includes('connectors') ? '/app/connectors' : query.includes('verification') ? '/app/execution' : '/app/command',
  })
  useEffect(() => { const id = window.setInterval(() => setPlaceholderIndex(x => (x + 1) % QUERIES.length), 3500); return () => window.clearInterval(id) }, [])
  const suggestions = useMemo(() => QUERIES.filter(x => x.toLowerCase().includes(q.toLowerCase())), [q])
  return <div style={{ padding: '10px 20px', borderTop: '0.5px solid var(--border-subtle)', background: 'var(--surface-0)', flexShrink: 0 }}>
    <div style={{display:'flex', alignItems:'center', gap:8}}><Terminal size={15} color="var(--text-tertiary)" /><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ask Certen — operational copilot narrator (synthetic)</span></div>
    <input value={q} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} onChange={e=>setQ(e.target.value)} placeholder={q ? 'Ask a guided question…' : QUERIES[placeholderIndex]} style={{ width:'100%', marginTop:8, fontSize:12 }} />
    {(q || focused) && <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:6 }}>{suggestions.map(s => <button key={s} onClick={()=>{setQ(s); setAnswer(replyFor(s))}} style={{fontSize:11}}>{s}</button>)}</div>}
    {answer && <div style={{ marginTop:8, fontSize:11, color:'var(--text-secondary)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
      {Object.entries(answer).filter(([k])=>k!=='jump').map(([k,v]) => <div key={k}><strong>{k}:</strong> {String(v)}</div>)}
      <button onClick={() => nav(answer.jump)} style={{gridColumn:'1 / -1', width:130}}>Jump to item</button>
    </div>}
  </div>
}
