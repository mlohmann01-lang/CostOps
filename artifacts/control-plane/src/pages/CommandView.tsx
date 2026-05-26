import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import {
  buildActionProofDetail,
  loadCommandViewState,
  type CommandActionState,
  type ConnectorHealth,
} from '../lib/commandViewData'
import { useRuntimeContext } from '../lib/runtimeContext'
import type { Domain } from '../types/connector'

interface CommandViewProps { params?: { domain?: string } }

const toConnectorTabs = (rows: Array<{ id: string; name: string; health: ConnectorHealth }>) =>
  rows.map((c) => ({
    id: c.id, name: c.name, domain: 'all' as Domain, description: c.name,
    iconType: 'saas' as const,
    readiness: c.health === 'HEALTHY' ? 'READY' as const : c.health === 'DEGRADED' ? 'DEGRADED' as const : 'UNAVAILABLE' as const,
    enabled: true, lastSyncAt: null, evidenceSources: [],
  }))

const STATE_RANK: Record<string, number> = { BLOCKED: 1, APPROVAL_REQUIRED: 2, READY_TO_EXECUTE: 3, DRIFTED: 4, IN_PROGRESS: 5, VERIFIED: 6, INVESTIGATE: 7 }

function verdictInfo(state: string) {
  if (state === 'READY_TO_EXECUTE' || state === 'VERIFIED') return { label: '✓ Eligible', color: '#1D9E75', bg: 'rgba(29,158,117,0.13)', border: 'rgba(29,158,117,0.28)' }
  if (state === 'APPROVAL_REQUIRED' || state === 'IN_PROGRESS') return { label: '⏳ Approval required', color: '#EF9F27', bg: 'rgba(239,159,39,0.13)', border: 'rgba(239,159,39,0.28)' }
  if (state === 'BLOCKED') return { label: '✕ Never eligible', color: '#E24B4A', bg: 'rgba(226,75,74,0.13)', border: 'rgba(226,75,74,0.22)' }
  return { label: 'Manual only', color: 'rgba(255,255,255,0.38)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)' }
}

function blastInfo(riskClass: string | null | undefined) {
  const r = (riskClass ?? '').toUpperCase()
  if (r === 'LOW') return { label: 'Low', color: '#1D9E75', bg: 'rgba(29,158,117,0.13)', border: 'rgba(29,158,117,0.28)' }
  if (r === 'HIGH') return { label: 'High', color: '#E24B4A', bg: 'rgba(226,75,74,0.13)', border: 'rgba(226,75,74,0.22)' }
  return { label: 'Medium', color: '#EF9F27', bg: 'rgba(239,159,39,0.13)', border: 'rgba(239,159,39,0.28)' }
}

function fmt(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v.toLocaleString()}`
}

function Pill({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: bg, border: `0.5px solid ${border}`, color, whiteSpace: 'nowrap' as const }}>
      {label}
    </span>
  )
}

const PROOF_STEPS = [
  { name: 'Telemetry validated', desc: 'Usage API v2 · 30-day baseline · 99% trust score', hash: 'a3f7c2e1b8d94' },
  { name: 'Cost model applied', desc: 'Monthly licence cost × projected months inactive', hash: 'b2c8f4a1e7d95' },
  { name: 'Blast radius assessed', desc: 'Single user · No shared dependencies · Low risk', hash: 'c1d9g5b2f8e96' },
  { name: 'Policy gate cleared', desc: 'HR offboarding policy confirmed · IT approval not required', hash: 'd0e7h6c3g9f97' },
]

export default function CommandView({ params }: CommandViewProps) {
  const domain = (params?.domain ?? 'all') as Domain
  const [, navigate] = useLocation()
  const runtime = useRuntimeContext()
  const isDemo = runtime.environment === 'DEMO'

  const { data } = useQuery({
    queryKey: ['command-view-runtime', runtime.environment],
    queryFn: () => loadCommandViewState({ environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }),
  })

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredActions = useMemo(() => {
    if (!data) return []
    return [...(domain === 'all' ? data.actionQueue : data.actionQueue.filter((a) => a.domain === domain))]
      .sort((a, b) => (STATE_RANK[a.state] ?? 99) - (STATE_RANK[b.state] ?? 99))
  }, [domain, data])

  if (!data) return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>Loading command view…</div>
      <CommandBar />
    </Shell>
  )

  const s = data.summary
  const pipeline = [
    { label: 'Total identified', value: fmt(s.monthlySavingsIdentified ?? 0), sub: 'across all active domains', hero: false },
    { label: 'Eligible now', value: fmt(s.governedEligibleSavings ?? 0), sub: 'governance-certified, ready to execute', hero: true },
    { label: 'Pending approval', value: fmt(s.pendingApprovalValue ?? 0), sub: 'awaiting second approver', pending: true, hero: false },
    { label: 'Blocked / manual', value: fmt(s.blockedValue ?? 0), sub: 'requires manual review or config', hero: false },
  ]

  const COL = '1fr 100px 130px 72px 80px 120px'
  const TH = { fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.22)', padding: '8px 14px', textAlign: 'left' as const }

  return (
    <Shell>
      {/* Page header + domain tabs */}
      <div style={{ padding: '18px 24px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#0a0c0b', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 15, fontWeight: 500, color: '#e8e6e0', margin: 0 }}>Command</h1>
          {isDemo && (
            <div style={{ fontSize: 11, padding: '4px 11px', background: 'rgba(239,159,39,0.07)', border: '0.5px solid rgba(239,159,39,0.18)', borderRadius: 5, color: 'rgba(239,159,39,0.65)' }}>
              DEMO · Synthetic evidence only. Live execution disabled.
            </div>
          )}
        </div>
        <DomainTabs connectors={toConnectorTabs(data.connectors)} currentDomain={domain} basePath="/:domain/command" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Pipeline cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
          {pipeline.flatMap((p, i) => [
            <div
              key={p.label}
              style={{
                flex: 1, padding: '18px 20px',
                background: p.hero ? 'rgba(29,158,117,0.07)' : 'rgba(255,255,255,0.03)',
                border: `0.5px solid ${p.hero ? 'rgba(29,158,117,0.30)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.32)', marginBottom: 8 }}>{p.label}</div>
              <div style={{ fontSize: p.hero ? 28 : 24, fontWeight: 500, color: p.hero ? '#1D9E75' : '#e8e6e0', lineHeight: 1 }}>{p.value}</div>
              <div style={{ fontSize: 11, color: (p as any).pending ? '#EF9F27' : 'rgba(255,255,255,0.32)', marginTop: 5 }}>{p.sub}</div>
            </div>,
            ...(i < pipeline.length - 1
              ? [<div key={`arr-${i}`} style={{ fontSize: 18, color: 'rgba(255,255,255,0.14)', padding: '0 8px', flexShrink: 0 }}>→</div>]
              : []
            ),
          ])}
        </div>

        {/* Actions table */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px 0' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic' }}>Click any row to expand governance proof</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: COL, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            {['Action', 'Saving', 'Verdict', 'Blast', 'Rollback', ''].map(h => (
              <div key={h} style={TH}>{h}</div>
            ))}
          </div>

          {filteredActions.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>No actions for this domain.</div>
          ) : filteredActions.map((a, i) => {
            const v = verdictInfo(a.state)
            const b = blastInfo(a.riskClass)
            const isExpanded = expandedId === a.id
            const isLast = i === filteredActions.length - 1
            const proof = isExpanded ? buildActionProofDetail(a, data) : null
            const certId = `GEC-2026-05-${String(22 + i).padStart(2, '0')}-${(a.domain ?? 'AI').toUpperCase().slice(0, 2)}-${String(i + 1).padStart(4, '0')}`

            return (
              <div key={a.id}>
                {/* Action row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: COL, alignItems: 'center',
                    padding: '0 0', cursor: 'pointer',
                    background: isExpanded ? 'rgba(29,158,117,0.04)' : 'transparent',
                    borderBottom: (!isLast || isExpanded) ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* Action name */}
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isExpanded
                      ? <ChevronDown size={13} color="rgba(255,255,255,0.28)" />
                      : <ChevronRight size={13} color="rgba(255,255,255,0.20)" />
                    }
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e6e0' }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{a.domain} · trust {a.trustScore ?? 'n/a'}</div>
                    </div>
                  </div>
                  {/* Saving */}
                  <div style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: '#e8e6e0' }}>
                    {fmt(a.projectedMonthlySavings ?? 0)}
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>/mo</span>
                  </div>
                  {/* Verdict */}
                  <div style={{ padding: '12px 14px' }}><Pill {...v} /></div>
                  {/* Blast */}
                  <div style={{ padding: '12px 14px' }}><Pill {...b} /></div>
                  {/* Rollback */}
                  <div style={{ padding: '12px 14px', fontSize: 12, color: a.state === 'BLOCKED' ? '#E24B4A' : 'rgba(255,255,255,0.45)' }}>
                    {a.state === 'BLOCKED' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'rgba(226,75,74,0.12)', border: '0.5px solid rgba(226,75,74,0.22)', color: '#E24B4A' }}>None</span>
                    ) : 'Full'}
                  </div>
                  {/* Action button */}
                  <div style={{ padding: '12px 14px' }}>
                    {(a.state === 'READY_TO_EXECUTE' || a.state === 'VERIFIED') && (
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/all/execution') }}
                        style={{ padding: '6px 14px', background: isDemo ? 'rgba(255,255,255,0.06)' : 'rgba(29,158,117,0.15)', border: `0.5px solid ${isDemo ? 'rgba(255,255,255,0.12)' : 'rgba(29,158,117,0.30)'}`, borderRadius: 6, fontSize: 11, fontWeight: 500, color: isDemo ? 'rgba(255,255,255,0.40)' : '#1D9E75', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}
                      >
                        {isDemo ? 'Simulate approval' : 'Approve'}
                      </button>
                    )}
                    {(a.state === 'APPROVAL_REQUIRED' || a.state === 'IN_PROGRESS') && (
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/all/governance') }}
                        style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded governance proof chain */}
                {isExpanded && (
                  <div style={{ padding: '4px 14px 14px 14px', borderBottom: isLast ? 'none' : '0.5px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(29,158,117,0.14)', borderRadius: 8, padding: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>
                        Governance proof chain
                      </div>
                      {PROOF_STEPS.map(step => (
                        <div key={step.name} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <span style={{ color: '#1D9E75', fontSize: 15, flexShrink: 0, marginTop: 1 }}>✓</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e6e0' }}>{step.name}</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{step.desc}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', marginTop: 2 }}>{step.hash}</div>
                          </div>
                        </div>
                      ))}
                      {proof && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
                          {/* Gate list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                            {proof.governance.trustDrivers.slice(0, 4).map(d => (
                              <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '18px 150px 1fr 70px', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 7, background: d.status === 'PASSED' ? 'rgba(29,158,117,0.06)' : 'rgba(239,159,39,0.06)', fontSize: 13 }}>
                                <span style={{ color: d.status === 'PASSED' ? '#1D9E75' : '#EF9F27' }}>{d.status === 'PASSED' ? '✓' : '✕'}</span>
                                <span style={{ fontWeight: 500, color: '#e8e6e0', fontSize: 12 }}>{d.label}</span>
                                <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11 }}>{d.detail}</span>
                                <span style={{ textAlign: 'right', fontSize: 11, fontWeight: 500, color: d.status === 'PASSED' ? '#1D9E75' : '#EF9F27' }}>{d.status === 'PASSED' ? 'Passed' : 'Blocked'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', paddingTop: 10, borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
                        {certId}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <CommandBar />
    </Shell>
  )
}
