import React from 'react'
import type { DataState } from '../../lib/dataState'
import { DATA_STATE_DESCRIPTIONS, DATA_STATE_LABELS } from '../../lib/dataState'

const palette: Record<DataState, { bg: string; fg: string; border: string }> = {
  LIVE: { bg: 'transparent', fg: 'var(--green)', border: 'var(--border-teal)' },
  SIMULATION: { bg: 'rgba(255,255,255,0.03)', fg: 'var(--amber)', border: 'var(--border-amber)' },
  DEMO: { bg: 'rgba(255,255,255,0.03)', fg: 'var(--amber)', border: 'var(--border-amber)' },
  NOT_CONNECTED: { bg: 'rgba(255,255,255,0.03)', fg: 'var(--red)', border: 'var(--border-red)' },
  NO_DATA: { bg: 'rgba(255,255,255,0.03)', fg: 'var(--text-secondary)', border: 'var(--border-default)' },
}

export function DataStateBanner({ state, detail, ctaLabel, ctaHref }: { state: DataState; detail?: string; ctaLabel?: string; ctaHref?: string }) {
  if (state === 'LIVE') return null
  const colors = palette[state]
  return (
    <div role={state === 'NOT_CONNECTED' ? 'alert' : 'status'} data-testid="data-state-banner" data-state={state} style={{ border: colors.border, background: colors.bg, color: colors.fg, borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <strong>{DATA_STATE_LABELS[state]}</strong>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{detail ?? DATA_STATE_DESCRIPTIONS[state]}</p>
      </div>
      {ctaLabel && ctaHref && (
        <a href={ctaHref} style={{ fontSize: 12, color: colors.fg, border: `1px solid ${colors.fg}`, borderRadius: 8, padding: '6px 10px', whiteSpace: 'nowrap' }}>{ctaLabel}</a>
      )}
    </div>
  )
}
