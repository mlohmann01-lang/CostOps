import { useState } from 'react'
import { ChevronDown, ChevronRight, Workflow as WorkflowIcon, Gauge, ShieldCheck } from 'lucide-react'
import { useWorkflowContext } from '../../hooks/useWorkflowContext'
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
  NO_DATA: 'No workflow linked',
}

export function WorkflowContext({ sourceSystem, sourceReference }: { sourceSystem?: string; sourceReference?: string }) {
  const [open, setOpen] = useState(false)
  const { workflow, evaluation, linkedInvestmentIds, linkedDecisionIds, linkedOutcomeIds, dataState, loading } = useWorkflowContext(sourceSystem, sourceReference)

  if (!sourceSystem || !sourceReference) return null

  return (
    <div data-testid="workflow-context" style={{ border: '1px solid var(--border-default)', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Workflow Context</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,.04)', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATE_DOT[dataState] }} />
          {loading ? 'Loading…' : STATE_LABEL[dataState]}
        </span>
      </button>
      {open && workflow && evaluation && (
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <WorkflowIcon size={12} /> Workflow: <span style={{ color: 'var(--text-primary)' }}>{workflow.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Gauge size={12} /> Type: <span style={{ color: 'var(--text-primary)' }}>{workflow.workflowType}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={12} /> Verdict: <span style={{ color: 'var(--text-primary)' }}>{evaluation.verdict}</span>
          </div>
          <div>Verified Value: <span style={{ color: 'var(--text-primary)' }}>{evaluation.verifiedValue.toLocaleString()}</span></div>
          <div>Protected Value: <span style={{ color: 'var(--text-primary)' }}>{evaluation.protectedValue.toLocaleString()}</span></div>
          <div>Linked Investment: <span style={{ color: 'var(--text-primary)' }}>{linkedInvestmentIds.join(', ') || '—'}</span></div>
          <div>Linked Decisions: <span style={{ color: 'var(--text-primary)' }}>{linkedDecisionIds.join(', ') || '—'}</span></div>
          <div>Linked Outcomes: <span style={{ color: 'var(--text-primary)' }}>{linkedOutcomeIds.join(', ') || '—'}</span></div>
          <div>Confidence: <span style={{ color: 'var(--text-primary)' }}>{evaluation.confidence}</span></div>
        </div>
      )}
      {open && !workflow && (
        <div style={{ padding: '0 10px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>No workflow linked for this item.</div>
      )}
    </div>
  )
}
