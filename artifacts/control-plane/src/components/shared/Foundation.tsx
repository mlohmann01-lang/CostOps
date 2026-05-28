import React from 'react'
import type { ReactNode } from 'react'
import { useWorkspace } from '../../lib/workspaceContext'

export function StatusPill({ status }: { status: 'ready'|'degraded'|'unavailable'|'eligible'|'approval-required'|'never-eligible'|'blocked'|'active'|'verified'|'pending'|'simulated' }) {
  const bad = ['unavailable','never-eligible','blocked']
  const warn = ['degraded','approval-required','pending']
  const bg = bad.includes(status) ? 'var(--red-bg)' : warn.includes(status) ? 'var(--amber-bg)' : 'var(--green-bg)'
  const fg = bad.includes(status) ? 'var(--red)' : warn.includes(status) ? 'var(--amber)' : 'var(--green)'
  return <span style={{fontSize:11,padding:'2px 8px',borderRadius:999,background:bg,color:fg}}>{status}</span>
}

export function MetricCard({ label, value, delta, hero }: { label:string; value:string; delta?:string; deltaDirection?: 'up'|'down'|'warn'|'neutral'; hero?: boolean }) {
  return <div style={{border: hero ? 'var(--border-teal)' : 'var(--border-default)', background:'var(--bg-card)', borderRadius:10, padding:12}}><div style={{fontSize:11,color:'var(--text-label)',textTransform:'uppercase'}}>{label}</div><div style={{fontSize:26,color:hero?'var(--teal)':'var(--text-primary)'}}>{value}</div>{delta && <div style={{fontSize:11,color:'var(--text-secondary)'}}>{delta}</div>}</div>
}
export function SectionLabel({ children }: { children: ReactNode }) { return <div style={{fontSize:11,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-label)'}}>{children}</div> }
export function TableRow({ columns, children, onClick }: { columns:string; children: ReactNode; hover?: boolean; onClick?: ()=>void }) { return <div onClick={onClick} style={{display:'grid',gridTemplateColumns:columns,padding:'8px 10px',cursor:onClick?'pointer':'default'}}>{children}</div> }
export function ActionButton({ variant }: { variant: 'approve'|'review'|'execute'|'simulate'|'rollback' }) { const { mode }=useWorkspace(); const label = mode==='demo' && variant==='approve' ? 'Simulate approval' : mode==='demo' && variant==='execute' ? 'Simulate execution' : ({approve:'Approve',review:'Review',execute:'Execute now',simulate:'Simulate',rollback:'Rollback'} as const)[variant]; return <button>{label}</button> }
export function EmptyState({ title, description, ctaLabel }: { icon?: ReactNode; title: string; description: string; ctaLabel?: string; ctaAction?: ()=>void }) { return <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginTop:80,gap:8}}><h3>{title}</h3><p>{description}</p>{ctaLabel && <button>{ctaLabel}</button>}</div> }
