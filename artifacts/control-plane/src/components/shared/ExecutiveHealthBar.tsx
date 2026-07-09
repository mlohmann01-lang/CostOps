import React from 'react'

export interface ExecutiveHealthBarProps {
  projectedValue: number
  verifiedValue: number
  financeValue: number
  protectedValue: number
  leakage?: number
  verificationBacklog?: number
  isConnected: boolean
}

function computeHealthScore(props: ExecutiveHealthBarProps): number {
  const { projectedValue: proj, verifiedValue: ver, financeValue: fin, protectedValue: prot, leakage = 0 } = props
  if (!proj) return 0
  const verifiedRate   = Math.min(1, ver / proj)
  const financeRate    = ver > 0 ? Math.min(1, fin / ver) : 0
  const protectedRate  = fin > 0 ? Math.min(1, prot / fin) : 0
  const leakInversion  = 1 - Math.min(1, leakage / proj)
  return Math.round((verifiedRate * 0.30 + financeRate * 0.25 + protectedRate * 0.25 + leakInversion * 0.20) * 100)
}

function healthLabel(score: number): { label: string; color: string } {
  if (score >= 91) return { label: 'Optimal',   color: '#22C55E' }
  if (score >= 76) return { label: 'Excellent',  color: '#22C55E' }
  if (score >= 61) return { label: 'Good',       color: '#F5C451' }
  if (score >= 41) return { label: 'Fair',       color: '#EF9F27' }
  return               { label: 'Critical',   color: '#EF4444' }
}

export function ExecutiveHealthBar(props: ExecutiveHealthBarProps) {
  const { projectedValue: proj, verifiedValue: ver, financeValue: fin, protectedValue: prot, leakage = 0, verificationBacklog = 0, isConnected } = props

  if (!isConnected || proj === 0) {
    return (
      <div
        data-testid="executive-health-bar"
        style={{
          background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '12px 18px',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>
          Economic Control Health
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Not Available</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          Connect Microsoft 365 to begin measuring governance health.
        </div>
      </div>
    )
  }

  const score = computeHealthScore(props)
  const { label, color } = healthLabel(score)
  const evidencePct = proj > 0 ? Math.round((ver / proj) * 100) : 0
  const financePct  = ver > 0  ? Math.round((fin / ver) * 100)  : 0
  const protPct     = proj > 0 ? Math.round((prot / proj) * 100) : 0
  const leakPct     = proj > 0 ? ((leakage / proj) * 100).toFixed(1) : '0'

  const pills = [
    { label: 'Evidence Confidence', value: `${evidencePct}%`, color: evidencePct >= 70 ? '#22C55E' : '#F5C451' },
    { label: 'Finance Coverage',    value: `${financePct}%`,  color: financePct  >= 70 ? '#22C55E' : '#F5C451' },
    { label: 'Protected Value',     value: `${protPct}%`,     color: protPct     >= 30 ? '#22C55E' : '#F5C451' },
    { label: 'Value Leakage',       value: `${leakPct}%`,     color: Number(leakPct) <= 10 ? '#22C55E' : '#EF4444' },
    { label: 'Verification Backlog', value: String(verificationBacklog), color: verificationBacklog > 0 ? '#60CDFF' : '#22C55E' },
  ]

  return (
    <div
      data-testid="executive-health-bar"
      style={{
        background: 'var(--surface-1)',
        border: `1px solid ${color}28`,
        borderRadius: 12, padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>
          Economic Control Health
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 110, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${score}%`, height: '100%', background: `linear-gradient(90deg, ${color}aa, ${color})`, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{score}%</span>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, borderRadius: 999, padding: '2px 9px', border: `0.5px solid ${color}55` }}>
            {label}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {pills.map(({ label: l, value, color: c }) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '5px 10px', display: 'flex', flexDirection: 'column', gap: 1, minWidth: 76 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: c, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
