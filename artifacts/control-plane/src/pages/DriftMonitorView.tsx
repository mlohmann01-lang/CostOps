import { useQuery } from '@tanstack/react-query'
import { useRuntimeContext } from '../lib/runtimeContext'
import { driftService } from '../services/platformServices'
import { Shell } from '../components/layout/Shell'
import { CommandBar } from '../components/layout/CommandBar'

interface DriftEvent {
  id: string
  title: string
  status: string
  severity: string
  valueAtRisk: number | null
  recommendedAction: string
}

function severityInfo(severity: string): { pillBg: string; pillBorder: string; pillColor: string; pillDot: string; label: string; riskColor: string } {
  const s = (severity ?? '').toUpperCase()
  if (s === 'HIGH') return { pillBg: 'rgba(226,75,74,0.14)', pillBorder: 'rgba(226,75,74,0.25)', pillColor: '#E24B4A', pillDot: '#E24B4A', label: 'High risk', riskColor: '#E24B4A' }
  if (s === 'MEDIUM') return { pillBg: 'rgba(239,159,39,0.14)', pillBorder: 'rgba(239,159,39,0.28)', pillColor: '#EF9F27', pillDot: '#EF9F27', label: 'Medium risk', riskColor: '#EF9F27' }
  return { pillBg: 'rgba(29,158,117,0.14)', pillBorder: 'rgba(29,158,117,0.28)', pillColor: '#1D9E75', pillDot: '#1D9E75', label: 'Low risk', riskColor: '#1D9E75' }
}

function statusInfo(status: string): { label: string; pillBg: string; pillBorder: string; pillColor: string; pillDot: string } {
  const s = (status ?? '').toUpperCase()
  if (s === 'ACTIVE' || s === 'ALERT') return { label: 'Active', pillBg: 'rgba(239,159,39,0.14)', pillBorder: 'rgba(239,159,39,0.28)', pillColor: '#EF9F27', pillDot: '#EF9F27' }
  if (s === 'RESOLVED') return { label: 'Resolved', pillBg: 'rgba(29,158,117,0.14)', pillBorder: 'rgba(29,158,117,0.28)', pillColor: '#1D9E75', pillDot: '#1D9E75' }
  return { label: status, pillBg: 'rgba(255,255,255,0.06)', pillBorder: 'rgba(255,255,255,0.10)', pillColor: 'rgba(255,255,255,0.40)', pillDot: 'rgba(255,255,255,0.30)' }
}

function fmt(v: number): string {
  return `$${v.toLocaleString()}`
}

export default function DriftMonitorView() {
  const runtime = useRuntimeContext()
  const isDemo = runtime.environment === 'DEMO'
  const runtimeOptions = { environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }
  const { data } = useQuery({ queryKey: ['drift', runtime.environment], queryFn: () => driftService.load(runtimeOptions) })

  if (!data) return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>Loading drift monitor…</div>
    </Shell>
  )

  const events = data.events as DriftEvent[]
  const stats = [
    { label: 'Active alerts', value: data.summary.activeDriftEvents, warn: (data.summary.activeDriftEvents ?? 0) > 0 },
    { label: 'Value at risk', value: typeof data.summary.valueAtRisk === 'number' ? fmt(data.summary.valueAtRisk) : data.summary.valueAtRisk ?? '—', warn: false },
    { label: 'Monitored outcomes', value: data.summary.monitoredOutcomes, warn: false },
  ]

  return (
    <Shell>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Page header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#0a0c0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDemo ? 10 : 0 }}>
            <h1 style={{ fontSize: 15, fontWeight: 500, color: '#e8e6e0', margin: 0 }}>Drift monitor</h1>
          </div>
          {isDemo && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', background: 'rgba(239,159,39,0.07)', border: '0.5px solid rgba(239,159,39,0.18)', borderRadius: 5, fontSize: 11, color: 'rgba(239,159,39,0.65)' }}>
              DEMO · Synthetic drift scenarios only. No live systems monitored.
            </div>
          )}
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
                <span style={{ display: 'block', fontSize: 28, fontWeight: 500, color: s.warn ? '#EF9F27' : '#e8e6e0', lineHeight: 1 }}>{s.value}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Drift alert cards */}
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>
            Drift alerts ({events.length})
          </div>

          {events.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13, background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
              No active drift events. All monitored outcomes are stable.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.map(e => {
                const sev = severityInfo(e.severity)
                const sts = statusInfo(e.status)
                return (
                  <div key={e.id} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 18px' }}>
                    {/* Header: status pill + risk */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: sts.pillBg, border: `0.5px solid ${sts.pillBorder}`, color: sts.pillColor }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sts.pillDot, flexShrink: 0 }} />
                        {sts.label}
                      </span>
                      <span style={{ fontSize: 12, color: sev.riskColor, fontWeight: 500 }}>
                        {sev.label}{e.valueAtRisk != null && ` · ${fmt(e.valueAtRisk)} at risk`}
                      </span>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#e8e6e0', marginBottom: 5 }}>{e.title}</div>

                    {/* Description */}
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', marginBottom: 14, lineHeight: 1.6 }}>
                      {e.status.toUpperCase()} · {e.recommendedAction}
                    </div>

                    {/* Action button */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 6, fontSize: 11, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                        Review evidence
                      </button>
                      {e.status.toUpperCase() === 'ACTIVE' && (
                        <button style={{ padding: '6px 14px', background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.22)', borderRadius: 6, fontSize: 11, color: '#1D9E75', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                          Mark resolved
                        </button>
                      )}
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
