import React, { type ReactNode } from 'react'
import { Link } from 'wouter'
import type { StatusChipTone } from './StatusChip'

const toneColor: Record<StatusChipTone, string> = { success: 'var(--green)', warning: 'var(--amber)', danger: 'var(--red)', neutral: 'var(--text-secondary)', info: 'var(--teal)' }

export function MetricCard({ label, value, description, tone = 'neutral', href }: { label:string; value:ReactNode; description?:ReactNode; tone?:StatusChipTone; href?:string }) {
  const content = <section style={{ minWidth:0, border:'1px solid rgba(148, 163, 184, .18)', background:'var(--surface-1)', borderRadius:16, padding:15, boxShadow:'0 12px 30px rgba(0,0,0,.10)', height:'100%', boxSizing:'border-box' }}>
    <div style={{ color:'var(--text-tertiary)', fontSize:11, textTransform:'uppercase', letterSpacing:'.08em', fontWeight:800 }}>{label}</div>
    <div style={{ marginTop:9, color:toneColor[tone], fontSize:'clamp(22px, 3vw, 32px)', lineHeight:1, fontWeight:850, letterSpacing:'-.03em' }}>{value}</div>
    {description && <div style={{ marginTop:8, color:'var(--text-secondary)', fontSize:12, lineHeight:1.45 }}>{description}</div>}
  </section>
  return href ? <Link href={href} style={{ color:'inherit', textDecoration:'none' }}>{content}</Link> : content
}
