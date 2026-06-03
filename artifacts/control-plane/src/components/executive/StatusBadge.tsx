export type BadgeTone = 'neutral' | 'good' | 'warning' | 'danger' | 'info'
const colors: Record<BadgeTone, { bg:string; border:string; color:string }> = {
  neutral: { bg:'rgba(148,163,184,.10)', border:'rgba(148,163,184,.28)', color:'var(--text-secondary)' },
  good: { bg:'rgba(34,197,94,.12)', border:'rgba(34,197,94,.3)', color:'var(--green)' },
  warning: { bg:'rgba(245,158,11,.12)', border:'rgba(245,158,11,.32)', color:'var(--amber)' },
  danger: { bg:'rgba(248,113,113,.12)', border:'rgba(248,113,113,.32)', color:'var(--red)' },
  info: { bg:'rgba(45,212,191,.12)', border:'rgba(45,212,191,.32)', color:'var(--teal)' },
}
export function StatusBadge({ status, tone='neutral' }: { status:string; tone?:BadgeTone }) {
  const c = colors[tone]
  return <span style={{ display:'inline-flex', alignItems:'center', gap:6, border:`1px solid ${c.border}`, background:c.bg, color:c.color, borderRadius:999, padding:'5px 10px', fontSize:11, fontWeight:800, letterSpacing:'.03em', textTransform:'uppercase' }}>{status}</span>
}
