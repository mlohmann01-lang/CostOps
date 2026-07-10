import { useState } from 'react'
import { ChevronDown, ChevronRight, ShieldCheck, FileText, Gauge } from 'lucide-react'
import { useDecisionContext } from '../../hooks/useDecisionContext'
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
  NO_DATA: 'No decision recorded',
}

export function DecisionContext({ sourceSystem, sourceReference }: { sourceSystem?: string; sourceReference?: string }) {
  const [open, setOpen] = useState(false)
  const { decision, dataState, loading } = useDecisionContext(sourceSystem, sourceReference)

  if (!sourceSystem || !sourceReference) return null

  return (
    <div data-testid="decision-context" style={{ border: '1px solid var(--border-default)', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Decision Context</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,.04)', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATE_DOT[dataState] }} />
          {loading ? 'Loading…' : STATE_LABEL[dataState]}
        </span>
      </button>
      {open && decision && (
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={12} /> Status: <span style={{ color: 'var(--text-primary)' }}>{decision.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Gauge size={12} /> Type: <span style={{ color: 'var(--text-primary)' }}>{decision.decisionType}</span>
          </div>
          {decision.rationale.length > 0 && (
            <div style={{ color: 'var(--text-primary)' }}>{decision.rationale.join('; ')}</div>
          )}
          {decision.trustSnapshot && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={12} /> Trust: <span style={{ color: 'var(--text-primary)' }}>{decision.trustSnapshot.trustLevel} ({decision.trustSnapshot.trustScore})</span>
            </div>
          )}
        </div>
      )}
      {open && !decision && (
        <div style={{ padding: '0 10px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>No decision recorded for this item.</div>
      )}
    </div>
  )
}
