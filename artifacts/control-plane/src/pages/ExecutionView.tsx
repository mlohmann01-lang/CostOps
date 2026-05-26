import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { X } from 'lucide-react'
import { useRuntimeContext } from '../lib/runtimeContext'
import { loadExecutionState } from '../lib/executionData'
import { Shell } from '../components/layout/Shell'
import { CommandBar } from '../components/layout/CommandBar'

interface ExecutionRecord {
  id: string
  title: string
  status: string
  environment: string
  rollbackStatus: string | null
}

function isCompleted(r: ExecutionRecord): boolean {
  const s = (r.status ?? '').toUpperCase()
  return s === 'VERIFIED' || s === 'COMPLETED' || s === 'EXECUTED'
}

function isAwaiting(r: ExecutionRecord): boolean {
  return !isCompleted(r)
}

function fmt(v: number): string {
  return `$${v.toLocaleString()}/mo`
}

const MOCK_APPROVED_BY = ['j.doe@acme.com', 'a.smith@acme.com', 'system', 'j.doe@acme.com']
const MOCK_APPROVED_AT = ['May 24, 2026 · 09:12', 'May 23, 2026 · 14:30', 'May 22, 2026 · 11:00', 'May 21, 2026 · 16:45']
const MOCK_SAVING = [4200, 3840, 1200, 6800]
const MOCK_BLAST: Array<{ label: string; color: string; bg: string; border: string }> = [
  { label: 'Low', color: '#1D9E75', bg: 'rgba(29,158,117,0.13)', border: 'rgba(29,158,117,0.28)' },
  { label: 'Low', color: '#1D9E75', bg: 'rgba(29,158,117,0.13)', border: 'rgba(29,158,117,0.28)' },
  { label: 'Medium', color: '#EF9F27', bg: 'rgba(239,159,39,0.13)', border: 'rgba(239,159,39,0.28)' },
  { label: 'Low', color: '#1D9E75', bg: 'rgba(29,158,117,0.13)', border: 'rgba(29,158,117,0.28)' },
]

const now = new Date('2026-05-26').getTime()
function isStale(dateStr: string): boolean {
  const d = new Date(dateStr.replace(' · ', ' ').replace('May ', 'May ')).getTime()
  return isNaN(d) ? false : (now - d) > 24 * 60 * 60 * 1000 * 2
}

export default function ExecutionView() {
  const runtime = useRuntimeContext()
  const isDemo = runtime.environment === 'DEMO'
  const runtimeOptions = { environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }
  const { data } = useQuery({ queryKey: ['execution', runtime.environment], queryFn: () => loadExecutionState(runtimeOptions) })

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [completedIds, setCompletedIds] = useState<string[]>([])

  if (!data) return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>Loading execution…</div>
    </Shell>
  )

  const records = data.records as ExecutionRecord[]
  const awaiting = records.filter(r => isAwaiting(r) && !completedIds.includes(r.id))
  const completed = [...records.filter(isCompleted), ...records.filter(r => completedIds.includes(r.id) && isAwaiting(r))]

  const totalRealised = completed.reduce((s, r, i) => s + (MOCK_SAVING[i % MOCK_SAVING.length] ?? 3000), 0)

  const COL_AWAIT = '1fr 160px 160px 72px 80px 130px'
  const COL_COMP  = '1fr 160px 90px 80px 120px'
  const TH: React.CSSProperties = { fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.22)', padding: '9px 14px', textAlign: 'left' }

  const confirmingRecord = confirmId ? records.find(r => r.id === confirmId) ?? awaiting.find(r => r.id === confirmId) : null

  return (
    <Shell>
      {/* Confirmation modal */}
      {confirmId && confirmingRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.70)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ width: 440, background: '#111413', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#e8e6e0' }}>{isDemo ? 'Simulate execution?' : 'Confirm execution'}</div>
              <button onClick={() => setConfirmId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 8, lineHeight: 1.6 }}>
              This will execute: <strong style={{ color: '#e8e6e0' }}>{confirmingRecord.title}</strong>
            </div>
            {isDemo && <div style={{ fontSize: 12, color: 'rgba(239,159,39,0.70)', padding: '8px 12px', background: 'rgba(239,159,39,0.07)', border: '0.5px solid rgba(239,159,39,0.18)', borderRadius: 6, marginBottom: 12 }}>Simulation only — no live systems will be affected.</div>}
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 20 }}>
              Rollback: <span style={{ color: '#e8e6e0' }}>Full</span> — reversal available within 72h
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setExecutingId(confirmId)
                  setConfirmId(null)
                  setTimeout(() => {
                    setCompletedIds(ids => [...ids, executingId ?? confirmId])
                    setExecutingId(null)
                  }, 1500)
                }}
                style={{ flex: 1, padding: '10px 0', background: isDemo ? 'rgba(255,255,255,0.07)' : '#1D9E75', border: `0.5px solid ${isDemo ? 'rgba(255,255,255,0.14)' : 'rgba(29,158,117,0.50)'}`, borderRadius: 8, fontSize: 13, fontWeight: 500, color: isDemo ? 'rgba(255,255,255,0.55)' : '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {isDemo ? 'Confirm simulation' : 'Confirm execution'}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                style={{ padding: '10px 18px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Page header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#0a0c0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDemo ? 10 : 0 }}>
            <h1 style={{ fontSize: 15, fontWeight: 500, color: '#e8e6e0', margin: 0 }}>Execution</h1>
          </div>
          {isDemo && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', background: 'rgba(239,159,39,0.07)', border: '0.5px solid rgba(239,159,39,0.18)', borderRadius: 5, fontSize: 11, color: 'rgba(239,159,39,0.65)' }}>
              DEMO · Execution is simulated. No production systems will be affected.
            </div>
          )}
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
            {[['Queued', data.summary.queued], ['Dry-run ready', data.summary.dryRunReady], ['Verified', data.summary.verified], ['Rollback available', data.summary.rollbackAvailable]].map(([k, v]) => (
              <div key={String(k)} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
                <span style={{ display: 'block', fontSize: 28, fontWeight: 500, color: '#e8e6e0', lineHeight: 1 }}>{v}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6 }}>{k}</span>
              </div>
            ))}
          </div>

          {/* Awaiting execution section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>
              Approved — awaiting execution ({awaiting.length})
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: COL_AWAIT, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
                {['Action', 'Approved by', 'Approved at', 'Blast', 'Rollback', ''].map(h => (
                  <div key={h} style={TH}>{h}</div>
                ))}
              </div>
              {awaiting.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>No items awaiting execution.</div>
              ) : awaiting.map((r, i) => {
                const blast = MOCK_BLAST[i % MOCK_BLAST.length]
                const approvedAt = MOCK_APPROVED_AT[i % MOCK_APPROVED_AT.length]
                const stale = isStale(approvedAt)
                const isExecuting = executingId === r.id
                const cellStyle: React.CSSProperties = { padding: '12px 14px', borderBottom: i < awaiting.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', fontSize: 13 }
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: COL_AWAIT }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <div style={{ ...cellStyle }}>
                      <div style={{ fontSize: 13, color: '#e8e6e0', fontWeight: 500 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>rollback: full · {r.environment}</div>
                    </div>
                    <div style={{ ...cellStyle, fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{MOCK_APPROVED_BY[i % MOCK_APPROVED_BY.length]}</div>
                    <div style={{ ...cellStyle, fontSize: 12, color: stale ? '#EF9F27' : 'rgba(255,255,255,0.42)' }} title={stale ? 'Approval is older than 24h' : ''}>{approvedAt}{stale && ' ⚠'}</div>
                    <div style={{ ...cellStyle }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: blast.bg, border: `0.5px solid ${blast.border}`, color: blast.color }}>{blast.label}</span>
                    </div>
                    <div style={{ ...cellStyle, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Full</div>
                    <div style={{ ...cellStyle }}>
                      {isExecuting ? (
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isDemo ? 'rgba(255,255,255,0.15)' : '#1D9E75'}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                      ) : (
                        <button
                          onClick={() => setConfirmId(r.id)}
                          style={{ padding: '6px 12px', background: isDemo ? 'rgba(255,255,255,0.05)' : 'rgba(29,158,117,0.12)', border: `0.5px solid ${isDemo ? 'rgba(255,255,255,0.10)' : 'rgba(29,158,117,0.28)'}`, borderRadius: 6, fontSize: 11, fontWeight: 500, color: isDemo ? 'rgba(255,255,255,0.38)' : '#1D9E75', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}
                        >
                          {isDemo ? 'Simulate execution' : 'Execute now'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Completed section */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>
              Completed ({completed.length})
            </div>
            {completed.length > 0 && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', marginBottom: 14 }}>
                Total saving realised: <strong style={{ color: '#1D9E75' }}>{fmt(totalRealised)}</strong>
                {isDemo && <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(239,159,39,0.60)' }}>(simulated)</span>}
              </div>
            )}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: COL_COMP, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
                {['Action', 'Executed by', 'Saving', 'Rollback', ''].map(h => (
                  <div key={h} style={TH}>{h}</div>
                ))}
              </div>
              {completed.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>No completed executions yet.</div>
              ) : completed.map((r, i) => {
                const saving = MOCK_SAVING[i % MOCK_SAVING.length]
                const cellStyle: React.CSSProperties = { padding: '12px 14px', borderBottom: i < completed.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', fontSize: 13 }
                const hasFull = (r.rollbackStatus ?? '').toUpperCase() !== 'NONE'
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: COL_COMP }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <div style={{ ...cellStyle }}>
                      <div style={{ fontSize: 13, color: '#e8e6e0', fontWeight: 500 }}>{r.title}</div>
                      {completedIds.includes(r.id) && isDemo && (
                        <div style={{ marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, padding: '2px 7px', background: 'rgba(239,159,39,0.10)', border: '0.5px solid rgba(239,159,39,0.22)', borderRadius: 20, color: '#EF9F27' }}>Simulated — no live systems affected</div>
                      )}
                    </div>
                    <div style={{ ...cellStyle, fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{MOCK_APPROVED_BY[i % MOCK_APPROVED_BY.length]}</div>
                    <div style={{ ...cellStyle, fontSize: 13, fontWeight: 500, color: '#1D9E75' }}>{fmt(saving)}</div>
                    <div style={{ ...cellStyle, fontSize: 12, color: hasFull ? 'rgba(255,255,255,0.45)' : '#E24B4A' }}>{hasFull ? 'Full' : 'None'}</div>
                    <div style={{ ...cellStyle }}>
                      {hasFull && (
                        <button style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 6, fontSize: 11, color: 'rgba(255,255,255,0.38)', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <CommandBar />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Shell>
  )
}
