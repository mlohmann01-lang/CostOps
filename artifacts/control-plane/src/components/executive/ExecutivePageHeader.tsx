import React, { type ReactNode } from 'react'
import { StatusChip, type StatusChipTone } from './StatusChip'

export type ExecutivePageHeaderChip = { label:string; tone?:StatusChipTone }

export function ExecutivePageHeader({ title, subtitle, chips, rightAction }: { title:string; subtitle:string; chips?:ExecutivePageHeaderChip[]; rightAction?:ReactNode }) {
  return <header style={{ display:'flex', justifyContent:'space-between', gap:18, alignItems:'flex-start', flexWrap:'wrap', border:'1px solid rgba(148, 163, 184, .18)', background:'var(--surface-1)', borderRadius:18, padding:'18px clamp(16px, 3vw, 24px)' }}>
    <div style={{ minWidth:260, maxWidth:820 }}>
      <h1 style={{ margin:'0 0 8px', fontSize:'clamp(28px, 4vw, 40px)', lineHeight:1.05, letterSpacing:'-.04em' }}>{title}</h1>
      <p style={{ margin:0, color:'var(--text-secondary)', fontSize:15, lineHeight:1.55 }}>{subtitle}</p>
    </div>
    <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end', alignItems:'center' }}>
      {(chips ?? []).map((chip) => <StatusChip key={chip.label} label={chip.label} tone={chip.tone} />)}
      {rightAction}
    </div>
  </header>
}
