import { useState } from 'react'
import { ChevronDown, ChevronRight, DollarSign, ShieldCheck, TrendingUp } from 'lucide-react'
import { useAICapitalAllocationContext } from '../../hooks/useAICapitalAllocationContext'
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
  NO_DATA: 'No AI capital allocation linked',
}

export function AICapitalAllocationContext({ workflowId, investmentId }: { workflowId?: string; investmentId?: string }) {
  const [open, setOpen] = useState(false)
  const { allocation, dataState, loading } = useAICapitalAllocationContext(workflowId, investmentId)

  if (!workflowId && !investmentId) return null

  return (
    <div data-testid="ai-capital-allocation-context" style={{ border: '1px solid var(--border-default)', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>AI Capital Allocation</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,.04)', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATE_DOT[dataState] }} />
          {loading ? 'Loading…' : STATE_LABEL[dataState]}
        </span>
      </button>
      {open && allocation && (
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <DollarSign size={12} /> Initiative: <span style={{ color: 'var(--text-primary)' }}>{allocation.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={12} /> Allocation Verdict: <span style={{ color: 'var(--text-primary)' }}>{allocation.allocationVerdict}</span>
          </div>
          <div>Recommended Action: <span style={{ color: 'var(--text-primary)' }}>{allocation.recommendedAction}</span></div>
          <div>Protected Value: <span style={{ color: 'var(--text-primary)' }}>{allocation.protectedValue.toLocaleString()}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={12} /> Ratio: <span style={{ color: 'var(--text-primary)' }}>{allocation.valueToCostRatio}x</span>
          </div>
          <div>Confidence: <span style={{ color: 'var(--text-primary)' }}>{allocation.allocationConfidence}</span></div>
        </div>
      )}
      {open && !allocation && (
        <div style={{ padding: '0 10px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>No AI capital allocation linked for this item.</div>
      )}
    </div>
  )
}
