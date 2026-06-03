import type { ReactNode } from 'react'
export function EmptyState({ title, description, icon }: { title:string; description:string; icon?:ReactNode }) {
  return <div style={{ border:'1px dashed rgba(148,163,184,.28)', borderRadius:16, padding:24, textAlign:'center', color:'var(--text-secondary)', background:'rgba(148,163,184,.05)' }}>{icon}<h3 style={{ color:'var(--text-primary)', margin:'8px 0' }}>{title}</h3><p style={{ margin:0 }}>{description}</p></div>
}
