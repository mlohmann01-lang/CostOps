import { useQuery } from '@tanstack/react-query'
import { useRuntimeContext } from '../lib/runtimeContext'
import { outcomeLedgerService } from '../services/platformServices'
import { Shell } from '../components/layout/Shell'
import { CommandBar } from '../components/layout/CommandBar'

interface OutcomeRecord {
  id: string
  title: string
  status: string
  environment: string
  projectedMonthlySavings: number | null
  verifiedMonthlySavings: number | null
}

function statusInfo(status: string): { label: string; bg: string; border: string; color: string; dot: string } {
  const s = (status ?? '').toUpperCase()
  if (s === 'VERIFIED') return { label: 'Verified', bg: 'rgba(29,158,117,0.14)', border: 'rgba(29,158,117,0.28)', color: '#1D9E75', dot: '#1D9E75' }
  if (s === 'PENDING' || s === 'VERIFICATION_PENDING') return { label: 'Pending', bg: 'rgba(239,159,39,0.14)', border: 'rgba(239,159,39,0.28)', color: '#EF9F27', dot: '#EF9F27' }
  if (s === 'PROJECTED') return { label: 'Projected', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', dot: 'rgba(255,255,255,0.30)' }
  return { label: status, bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)', dot: 'rgba(255,255,255,0.28)' }
}

function fmtMo(v: number | null): string {
  if (v == null) return '—'
  return `$${v.toLocaleString()}/mo`
}

function fmtSummary(v: string | number | null | undefined): string {
  if (v == null) return '—'
  if (typeof v === 'number') return `$${v.toLocaleString()}`
  return String(v)
}

export default function OutcomeLedgerView() {
  const runtime = useRuntimeContext()
  const isDemo = runtime.environment === 'DEMO'
  const runtimeOptions = { environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }
  const { data } = useQuery({ queryKey: ['outcomes', runtime.environment], queryFn: () => outcomeLedgerService.load(runtimeOptions) })

  if (!data) return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>Loading outcome ledger…</div>
    </Shell>
  )

  const outcomes = data.outcomes as OutcomeRecord[]

  const stats = [
    { label: 'Projected monthly', value: fmtSummary(data.summary.projectedMonthlySavings), teal: false },
    { label: 'Verified monthly', value: fmtSummary(data.summary.verifiedMonthlySavings), teal: true },
    { label: 'Verification pending', value: String(data.summary.verificationPending ?? 0), teal: false },
  ]

  return (
    <Shell>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Page header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#0a0c0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDemo ? 10 : 0 }}>
            <h1 style={{ fontSize: 15, fontWeight: 500, color: '#e8e6e0', margin: 0 }}>Outcome ledger</h1>
          </div>
          {isDemo && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', background: 'rgba(239,159,39,0.07)', border: '0.5px solid rgba(239,159,39,0.18)', borderRadius: 5, fontSize: 11, color: 'rgba(239,159,39,0.65)' }}>
              DEMO · Synthetic ledger entries only. All savings figures are illustrative.
            </div>
          )}
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: s.teal ? 'rgba(29,158,117,0.06)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${s.teal ? 'rgba(29,158,117,0.22)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: 16 }}>
                <span style={{ display: 'block', fontSize: 28, fontWeight: 500, color: s.teal ? '#1D9E75' : '#e8e6e0', lineHeight: 1 }}>{s.value}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6 }}>{s.label}</span>
                {s.teal && <span style={{ display: 'block', fontSize: 11, color: 'rgba(29,158,117,0.60)', marginTop: 3 }}>Confirmed real money</span>}
              </div>
            ))}
          </div>

          {/* Outcomes list */}
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>
            Ledger entries ({outcomes.length})
          </div>

          {outcomes.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13, background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
              No outcome entries recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
              {outcomes.map((o, i) => {
                const sts = statusInfo(o.status)
                const isVerified = (o.status ?? '').toUpperCase() === 'VERIFIED'
                const isLast = i === outcomes.length - 1
                return (
                  <div
                    key={o.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: isLast ? 'none' : '0.5px solid rgba(255,255,255,0.05)', transition: 'background 0.10s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e6e0', marginBottom: 3 }}>{o.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        Projected {fmtMo(o.projectedMonthlySavings)}
                        {o.verifiedMonthlySavings != null && (
                          <> · Verified <span style={{ color: '#1D9E75' }}>{fmtMo(o.verifiedMonthlySavings)}</span></>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, marginLeft: 20 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: sts.bg, border: `0.5px solid ${sts.border}`, color: sts.color }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sts.dot, flexShrink: 0 }} />
                        {sts.label}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 500, color: isVerified ? '#1D9E75' : '#e8e6e0', minWidth: 80, textAlign: 'right' as const }}>
                        {isVerified ? fmtMo(o.verifiedMonthlySavings) : fmtMo(o.projectedMonthlySavings)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <CommandBar />
    </Shell>
  )
}
