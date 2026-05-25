import { useMemo, useState } from 'react'
import { Terminal } from 'lucide-react'

const QUERIES = [
  'What is my biggest saving opportunity?',
  'What is blocked?',
  'What needs approval?',
  'What changed today?',
  'Show drift risks',
  'Why is this action eligible?'
]

export function CommandBar() {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const suggestions = useMemo(() => QUERIES.filter(x => x.toLowerCase().includes(q.toLowerCase())), [q])
  return (
    <div style={{ padding: '10px 20px', borderTop: '0.5px solid var(--border-subtle)', background: 'var(--surface-0)', flexShrink: 0 }}>
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <Terminal size={15} color="var(--text-tertiary)" />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ask Certen beta</span>
      </div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Ask a guided question…' style={{ width:'100%', marginTop:8, fontSize:12 }} />
      {q && <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:6 }}>{suggestions.map(s => <button key={s} onClick={()=>{setQ(s); setAnswer(`Guided response for: ${s}`)}} style={{fontSize:11}}>{s}</button>)}</div>}
      {answer && <div style={{ marginTop:8, fontSize:11, color:'var(--text-secondary)' }}>{answer}</div>}
    </div>
  )
}
