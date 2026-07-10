import React, { type ReactNode } from 'react'
import { Link } from 'wouter'

export function EmptyState({ title, description, icon, actionLabel, actionHref }: { title:string; description:string; icon?:ReactNode; actionLabel?:string; actionHref?:string }) {
  return <div style={{ border:'1px dashed rgba(148,163,184,.28)', borderRadius:16, padding:24, textAlign:'center', color:'var(--text-secondary)', background:'rgba(148,163,184,.05)' }}>{icon}<h3 style={{ color:'var(--text-primary)', margin:'8px 0' }}>{title}</h3><p style={{ margin:0 }}>{description}</p>{actionLabel && actionHref && <Link href={actionHref} style={{ display:'inline-flex', marginTop:14, color:'var(--teal)', fontWeight:800 }}>{actionLabel}</Link>}</div>
}
