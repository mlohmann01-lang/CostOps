import type { ReactNode } from 'react'
export type KpiTone = 'neutral' | 'good' | 'warning' | 'danger' | 'info'
const toneColor: Record<KpiTone, string> = { neutral: 'var(--text-secondary)', good: 'var(--green)', warning: 'var(--amber)', danger: 'var(--red)', info: 'var(--teal)' }
export function ExecutiveKpiCard({ label, value, sublabel, tone = 'neutral', trend, footer }: { label:string; value:ReactNode; sublabel?:ReactNode; tone?:KpiTone; trend?:ReactNode; footer?:ReactNode }) {
  return <section style={{ minWidth: 0, border: '1px solid rgba(148, 163, 184, .18)', background: 'linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.018))', borderRadius: 18, padding: 16, boxShadow: '0 14px 38px rgba(0,0,0,.16)' }}>
    <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center' }}><div style={{ color:'var(--text-tertiary)', fontSize:11, textTransform:'uppercase', letterSpacing:'.08em', fontWeight:700 }}>{label}</div>{trend && <div style={{ color:toneColor[tone], fontSize:12 }}>{trend}</div>}</div>
    <div style={{ marginTop: 10, color: toneColor[tone], fontSize: 'clamp(24px, 3vw, 34px)', lineHeight: 1, fontWeight: 800, letterSpacing:'-.03em' }}>{value}</div>
    {sublabel && <div style={{ marginTop: 8, color:'var(--text-secondary)', fontSize:12, lineHeight:1.45 }}>{sublabel}</div>}
    {footer && <div style={{ marginTop: 12, paddingTop: 10, borderTop:'var(--border-default)', color:'var(--text-tertiary)', fontSize:12 }}>{footer}</div>}
  </section>
}
