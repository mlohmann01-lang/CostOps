import type { ReactNode } from 'react'

type Stage = { label:string; value:ReactNode; count?:ReactNode; confidence?:ReactNode }

export function ValueLifecycle({ stages }: { stages: Stage[] }) {
  return <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(145px, 1fr))', gap:10 }}>
    {stages.map((stage, index) => <div key={stage.label} style={{ position:'relative', border:'1px solid rgba(148, 163, 184, .18)', background:'rgba(148,163,184,.05)', borderRadius:14, padding:13, minWidth:0 }}>
      <div style={{ color:'var(--text-tertiary)', fontSize:10, fontWeight:850, letterSpacing:'.08em', textTransform:'uppercase' }}>{index + 1}. {stage.label}</div>
      <div style={{ marginTop:8, color:'var(--teal)', fontSize:22, fontWeight:850, letterSpacing:'-.03em' }}>{stage.value}</div>
      <div style={{ marginTop:6, display:'flex', justifyContent:'space-between', gap:8, color:'var(--text-secondary)', fontSize:12 }}><span>{stage.count ?? '0'} actions</span><span>{stage.confidence ?? 'Review'}</span></div>
    </div>)}
  </div>
}
