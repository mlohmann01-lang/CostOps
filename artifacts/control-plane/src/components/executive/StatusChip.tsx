export type StatusChipTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

const colors: Record<StatusChipTone, { bg:string; border:string; color:string }> = {
  success: { bg:'rgba(34,197,94,.12)', border:'rgba(34,197,94,.3)', color:'var(--green)' },
  warning: { bg:'rgba(245,158,11,.12)', border:'rgba(245,158,11,.32)', color:'var(--amber)' },
  danger: { bg:'rgba(248,113,113,.12)', border:'rgba(248,113,113,.32)', color:'var(--red)' },
  neutral: { bg:'rgba(148,163,184,.10)', border:'rgba(148,163,184,.28)', color:'var(--text-secondary)' },
  info: { bg:'rgba(45,212,191,.12)', border:'rgba(45,212,191,.32)', color:'var(--teal)' },
}

export function StatusChip({ label, tone = 'neutral' }: { label:string; tone?:StatusChipTone }) {
  const color = colors[tone]
  return <span style={{ display:'inline-flex', alignItems:'center', gap:6, border:`1px solid ${color.border}`, background:color.bg, color:color.color, borderRadius:999, padding:'5px 10px', fontSize:11, fontWeight:800, letterSpacing:'.03em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{label}</span>
}
