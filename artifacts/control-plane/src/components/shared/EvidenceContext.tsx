import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { useEvidenceContext } from '../../hooks/useEvidenceContext'
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
  NO_DATA: 'No evidence',
}

export function EvidenceContext({ evidenceIds, targetType, targetId }: { evidenceIds?: string[]; targetType?: string; targetId?: string }) {
  const [open, setOpen] = useState(false)
  const { records, dataState, loading } = useEvidenceContext({ evidenceIds, targetType, targetId })

  if ((!evidenceIds || evidenceIds.length === 0) && (!targetType || !targetId)) return null

  return (
    <div data-testid="evidence-context" style={{ border: '1px solid var(--border-default)', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Evidence</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,.04)', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATE_DOT[dataState] }} />
          {loading ? 'Loading…' : `${STATE_LABEL[dataState]}${records.length ? ` (${records.length})` : ''}`}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          {records.length === 0 && <div>No evidence records found.</div>}
          {records.map((record) => (
            <div key={record.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <FileText size={12} style={{ marginTop: 2 }} />
              <div>
                <div style={{ color: 'var(--text-primary)' }}>{record.title ?? record.evidenceRef}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  {record.sourceSystem ?? 'unknown source'} · {record.status ?? 'unknown status'} · trust {record.trustLevel ?? 'n/a'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
