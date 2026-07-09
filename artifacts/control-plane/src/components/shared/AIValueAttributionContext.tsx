import { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles, Gauge, ShieldCheck } from 'lucide-react'
import { useAIValueAttributionContext } from '../../hooks/useAIValueAttributionContext'
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
  NO_DATA: 'No AI activity linked',
}

export function AIValueAttributionContext({ sourceSystem, sourceReference }: { sourceSystem?: string; sourceReference?: string }) {
  const [open, setOpen] = useState(false)
  const { activity, evaluation, linkedWorkflowIds, evidenceCount, dataState, loading } = useAIValueAttributionContext(sourceSystem, sourceReference)

  if (!sourceSystem || !sourceReference) return null

  return (
    <div data-testid="ai-value-attribution-context" style={{ border: '1px solid var(--border-default)', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>AI Value Attribution</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,.04)', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATE_DOT[dataState] }} />
          {loading ? 'Loading…' : STATE_LABEL[dataState]}
        </span>
      </button>
      {open && activity && evaluation && (
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} /> Activity: <span style={{ color: 'var(--text-primary)' }}>{activity.activityName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Gauge size={12} /> Type: <span style={{ color: 'var(--text-primary)' }}>{activity.activityType}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={12} /> Verdict: <span style={{ color: 'var(--text-primary)' }}>{evaluation.verdict}</span>
          </div>
          <div>Attributed Value: <span style={{ color: 'var(--text-primary)' }}>{evaluation.totalAttributedValue.toLocaleString()}</span></div>
          <div>Linked Workflows: <span style={{ color: 'var(--text-primary)' }}>{linkedWorkflowIds.join(', ') || '—'}</span></div>
          <div>Evidence Count: <span style={{ color: 'var(--text-primary)' }}>{evidenceCount}</span></div>
          <div>Confidence: <span style={{ color: 'var(--text-primary)' }}>{evaluation.confidence}</span></div>
        </div>
      )}
      {open && !activity && (
        <div style={{ padding: '0 10px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>No AI activity linked for this item.</div>
      )}
    </div>
  )
}
