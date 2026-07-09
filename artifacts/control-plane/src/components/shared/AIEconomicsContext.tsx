import { useState } from 'react'
import { ChevronDown, ChevronRight, Gauge, ShieldCheck, TrendingUp } from 'lucide-react'
import { useAIEconomicsContext } from '../../hooks/useAIEconomicsContext'
import type { DataState } from '../../lib/dataState'

const STATE_DOT: Record<DataState, string> = {
  LIVE: 'var(--c-teal-400)',
  SIMULATION: 'var(--c-amber-400)',
  DEMO: 'var(--c-amber-400)',
  NOT_CONNECTED: 'var(--c-red-400)',
  NO_DATA: 'var(--c-gray-400)',
}

const STATE_LABEL: Record<DataState, string> = {
  LIVE: 'Live',
  SIMULATION: 'Simulated',
  DEMO: 'Demo',
  NOT_CONNECTED: 'Not connected',
  NO_DATA: 'No AI economic profile linked',
}

export function AIEconomicsContext({ investmentId, workflowId }: { investmentId?: string; workflowId?: string }) {
  const [open, setOpen] = useState(false)
  const { profile, dataState, loading } = useAIEconomicsContext(investmentId, workflowId)

  if (!investmentId && !workflowId) return null

  return (
    <div data-testid="ai-economics-context" style={{ border: '1px solid var(--border-default)', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>AI Economics</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,.04)', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATE_DOT[dataState] }} />
          {loading ? 'Loading…' : STATE_LABEL[dataState]}
        </span>
      </button>
      {open && profile && (
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Gauge size={12} /> Investment: <span style={{ color: 'var(--text-primary)' }}>{profile.profileName}</span>
          </div>
          <div>Spend: <span style={{ color: 'var(--text-primary)' }}>{profile.totalSpend.toLocaleString()}</span></div>
          <div>Value: <span style={{ color: 'var(--text-primary)' }}>{profile.totalAttributedValue.toLocaleString()}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={12} /> Ratio: <span style={{ color: 'var(--text-primary)' }}>{profile.valueToCostRatio}x</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={12} /> Verdict: <span style={{ color: 'var(--text-primary)' }}>{profile.verdict}</span>
          </div>
          <div>Confidence: <span style={{ color: 'var(--text-primary)' }}>{profile.economicConfidence}</span></div>
        </div>
      )}
      {open && !profile && (
        <div style={{ padding: '0 10px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>No AI economic profile linked for this item.</div>
      )}
    </div>
  )
}
