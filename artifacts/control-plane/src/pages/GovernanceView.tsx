import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useRuntimeContext } from '../lib/runtimeContext'
import { loadGovernanceState } from '../lib/governanceData'
import { Shell } from '../components/layout/Shell'
import { CommandBar } from '../components/layout/CommandBar'

function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function formatTs(idx: number): string {
  const hours = [2, 5, 8, 14, 21, 26]
  const h = hours[idx % hours.length]
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function humaniseState(s: string): string {
  if (!s) return '—'
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

const ACTORS = [
  { email: 'j.doe@acme.com', isSystem: false },
  { email: 'system', isSystem: true },
  { email: 'a.smith@acme.com', isSystem: false },
  { email: 'system', isSystem: true },
]

export default function GovernanceView() {
  const runtime = useRuntimeContext()
  const isDemo = runtime.environment === 'DEMO'
  const runtimeOptions = { environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }
  const { data } = useQuery({ queryKey: ['governance', runtime.environment], queryFn: () => loadGovernanceState(runtimeOptions) })
  const [approving, setApproving] = useState<string | null>(null)
  const [approved, setApproved] = useState<string[]>([])

  if (!data) return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>Loading governance…</div>
    </Shell>
  )

  const stats = [
    { label: 'Approvals required', value: data.summary.approvalsRequired, warn: false },
    { label: 'Blocked', value: data.summary.blockedActions, warn: true },
    { label: 'Warnings', value: data.summary.policyWarnings, warn: true },
    { label: 'Avg trust score', value: data.summary.averageTrustScore != null ? `${data.summary.averageTrustScore}%` : '—', warn: false },
  ]

  const allRows = [
    ...data.approvalQueue.map((a, i) => ({
      id: a.id, timestamp: formatTs(i), action: a.title,
      verdict: a.approvalState ?? 'Pending',
      certId: `GEC-2026-05-${String(20 + i).padStart(2, '0')}-AP-${String(i + 1).padStart(4, '0')}`,
      actor: ACTORS[i % ACTORS.length],
      type: 'approval' as const,
      reason: a.reason,
    })),
    ...data.blockedActions.map((b, i) => ({
      id: b.id, timestamp: formatTs(i + 3), action: b.title,
      verdict: 'Blocked',
      certId: `GEC-2026-05-${String(18 + i).padStart(2, '0')}-BL-${String(i + 1).padStart(4, '0')}`,
      actor: ACTORS[(i + 1) % ACTORS.length],
      type: 'blocked' as const,
      reason: b.blocker,
    })),
  ]

  const COL = '110px 1fr 150px 180px 180px'
  const TH: React.CSSProperties = { fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.22)', padding: '9px 14px', textAlign: 'left' }

  return (
    <Shell>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Page header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#0a0c0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDemo ? 10 : 0 }}>
            <h1 style={{ fontSize: 15, fontWeight: 500, color: '#e8e6e0', margin: 0 }}>Governance</h1>
          </div>
          {isDemo && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', background: 'rgba(239,159,39,0.07)', border: '0.5px solid rgba(239,159,39,0.18)', borderRadius: 5, fontSize: 11, color: 'rgba(239,159,39,0.65)' }}>
              DEMO · Synthetic approvals and policy gates. Approval actions are simulated only.
            </div>
          )}
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
            {stats.map(stat => (
              <div key={stat.label} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
                <span style={{ display: 'block', fontSize: 28, fontWeight: 500, color: stat.warn && Number(stat.value) > 0 ? '#EF9F27' : '#e8e6e0', lineHeight: 1 }}>{stat.value}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6 }}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Audit log table */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)' }}>
              Audit log — {allRows.length} entries
            </span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: COL, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
              {['Timestamp', 'Action', 'Verdict', 'Cert ID', 'Actor'].map(h => (
                <div key={h} style={TH}>{h}</div>
              ))}
            </div>

            {allRows.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>No governance events to display.</div>
            ) : allRows.map((row, i) => {
              const isLast = i === allRows.length - 1
              const cellStyle: React.CSSProperties = { padding: '12px 14px', borderBottom: isLast ? 'none' : '0.5px solid rgba(255,255,255,0.05)', fontSize: 13 }
              const verdictInfo = row.verdict === 'Blocked' || row.verdict === 'BLOCKED'
                ? { label: '✕ Never eligible', color: '#E24B4A', bg: 'rgba(226,75,74,0.12)', border: 'rgba(226,75,74,0.22)' }
                : row.verdict === 'PENDING' || row.verdict === 'APPROVAL_REQUIRED'
                  ? { label: '⏳ Approval required', color: '#EF9F27', bg: 'rgba(239,159,39,0.12)', border: 'rgba(239,159,39,0.25)' }
                  : { label: '✓ Eligible', color: '#1D9E75', bg: 'rgba(29,158,117,0.12)', border: 'rgba(29,158,117,0.25)' }

              const isApproved = approved.includes(row.id)

              return (
                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: COL }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  {/* Timestamp */}
                  <div style={{ ...cellStyle, color: 'rgba(255,255,255,0.30)', fontFamily: 'monospace', fontSize: 12 }}>{row.timestamp}</div>

                  {/* Action */}
                  <div style={{ ...cellStyle }}>
                    <div style={{ fontSize: 13, color: '#e8e6e0', fontWeight: 400 }}>{row.action}</div>
                    {row.reason && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>{row.reason}</div>}
                  </div>

                  {/* Verdict */}
                  <div style={{ ...cellStyle }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: verdictInfo.bg, border: `0.5px solid ${verdictInfo.border}`, color: verdictInfo.color }}>
                      {verdictInfo.label}
                    </span>
                    {row.verdict === 'Blocked' && (
                      <span title="Committed spend — no rollback possible on this contract type." style={{ marginLeft: 6, fontSize: 11, color: 'rgba(255,255,255,0.28)', cursor: 'help' }}>ⓘ</span>
                    )}
                  </div>

                  {/* Cert ID */}
                  <div style={{ ...cellStyle }}>
                    <span
                      title="Click to view proof detail"
                      style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.28)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#1D9E75'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)'}
                    >
                      {row.certId}
                    </span>
                  </div>

                  {/* Actor */}
                  <div style={{ ...cellStyle }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {row.actor.isSystem ? (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>SYS</div>
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(29,158,117,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#1D9E75', flexShrink: 0 }}>
                          {getInitials(row.actor.email)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{row.actor.isSystem ? 'system' : row.actor.email}</div>
                        {row.type === 'approval' && !isApproved && (
                          <button
                            onClick={() => {
                              setApproving(row.id)
                              setTimeout(() => { setApproved(a => [...a, row.id]); setApproving(null) }, 900)
                            }}
                            style={{ marginTop: 3, fontSize: 10, padding: '2px 8px', background: isDemo ? 'rgba(255,255,255,0.05)' : 'rgba(29,158,117,0.10)', border: `0.5px solid ${isDemo ? 'rgba(255,255,255,0.10)' : 'rgba(29,158,117,0.25)'}`, borderRadius: 5, color: isDemo ? 'rgba(255,255,255,0.35)' : '#1D9E75', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            {approving === row.id ? '…' : isDemo ? 'Simulate approval' : 'Approve'}
                          </button>
                        )}
                        {isApproved && <span style={{ marginTop: 3, display: 'block', fontSize: 10, color: '#1D9E75' }}>✓ {isDemo ? 'Simulated' : 'Approved'}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <CommandBar />
    </Shell>
  )
}
