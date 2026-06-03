import type { ReactNode } from 'react'
export function ExecutiveSection({ title, description, rightSlot, children, testId }: { title:string; description?:ReactNode; rightSlot?:ReactNode; children:ReactNode; testId?:string }) {
  return <section data-testid={testId} style={{ border:'1px solid rgba(148,163,184,.18)', background:'var(--surface-1)', borderRadius:18, padding:18, boxShadow:'0 16px 42px rgba(0,0,0,.12)', minWidth:0 }}>
    <div style={{ display:'flex', justifyContent:'space-between', gap:14, alignItems:'flex-start', marginBottom:14, flexWrap:'wrap' }}>
      <div><h2 style={{ margin:'0 0 6px', fontSize:20, letterSpacing:'-.02em' }}>{title}</h2>{description && <p style={{ margin:0, color:'var(--text-secondary)', lineHeight:1.55 }}>{description}</p>}</div>
      {rightSlot}
    </div>
    {children}
  </section>
}
