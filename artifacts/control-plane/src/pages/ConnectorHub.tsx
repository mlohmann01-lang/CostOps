import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useRuntimeContext } from '../lib/runtimeContext'
import { loadConnectorHubState } from '../lib/connectorHubData'
import { Shell } from '../components/layout/Shell'
import { CommandBar } from '../components/layout/CommandBar'
import { Cloud, Building2, Users, Brain, MessageSquare, GitBranch, Video, Server, Settings, Plus, RefreshCw } from 'lucide-react'

type ConnectorHealth = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE'
interface ConnectorItem { id: string; name: string; mode: string; health: ConnectorHealth; capability: string }

function getIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('m365') || n.includes('microsoft') || n.includes('365')) return Building2
  if (n.includes('aws') || n.includes('amazon')) return Cloud
  if (n.includes('azure')) return Cloud
  if (n.includes('salesforce')) return Users
  if (n.includes('openai') || n.includes('ai')) return Brain
  if (n.includes('slack')) return MessageSquare
  if (n.includes('github') || n.includes('git')) return GitBranch
  if (n.includes('zoom')) return Video
  if (n.includes('gcp') || n.includes('google')) return Server
  if (n.includes('servicenow')) return Settings
  return Server
}

function getIconColor(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('aws') || n.includes('amazon')) return '#FF9900'
  if (n.includes('azure')) return '#0089D6'
  if (n.includes('m365') || n.includes('microsoft') || n.includes('365')) return '#0078D4'
  if (n.includes('salesforce')) return '#00A1E0'
  if (n.includes('openai') || n.includes('ai')) return '#1D9E75'
  if (n.includes('slack')) return '#E01E5A'
  if (n.includes('github') || n.includes('git')) return '#e8e6e0'
  if (n.includes('zoom')) return '#2D8CFF'
  if (n.includes('gcp') || n.includes('google')) return '#4285F4'
  return 'rgba(255,255,255,0.40)'
}

function getConnectorDesc(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('m365') || n.includes('microsoft') || n.includes('365')) return 'Identity · Licences · Usage · Entra ID · Exchange'
  if (n.includes('aws') || n.includes('amazon')) return 'Cloud spend · EC2 · S3 · RDS · Cost Explorer'
  if (n.includes('azure')) return 'Azure subscriptions · Resource groups · Cost Management'
  if (n.includes('salesforce')) return 'CRM licences · User activity · Sales Cloud seats'
  if (n.includes('openai') || n.includes('ai')) return 'API usage · Token spend · Model routing'
  if (n.includes('slack')) return 'Workspace activity · Paid seat occupancy'
  if (n.includes('github') || n.includes('git')) return 'Seat utilisation · Active contributors'
  if (n.includes('zoom')) return 'Meeting usage · Host licences · Webinar seats'
  if (n.includes('gcp') || n.includes('google')) return 'GCP billing · BigQuery · Compute Engine'
  if (n.includes('servicenow')) return 'ITAM entitlements · Software catalogue · CMDB'
  return 'Connected data source · Live telemetry'
}

function getLastSync(health: ConnectorHealth): string {
  if (health === 'HEALTHY') return 'Synced 12m ago'
  if (health === 'DEGRADED') return 'Synced 3h ago'
  return 'Never synced'
}

const PILL: Record<ConnectorHealth, { bg: string; border: string; color: string; dot: string; label: string }> = {
  HEALTHY:     { bg: 'rgba(29,158,117,0.14)', border: 'rgba(29,158,117,0.30)', color: '#1D9E75', dot: '#1D9E75', label: 'Ready' },
  DEGRADED:    { bg: 'rgba(239,159,39,0.14)', border: 'rgba(239,159,39,0.30)', color: '#EF9F27', dot: '#EF9F27', label: 'Degraded' },
  UNAVAILABLE: { bg: 'rgba(226,75,74,0.14)', border: 'rgba(226,75,74,0.25)', color: '#E24B4A', dot: '#E24B4A', label: 'Unavailable' },
}

const CARD_BORDER: Record<ConnectorHealth, string> = {
  HEALTHY: 'rgba(255,255,255,0.08)',
  DEGRADED: 'rgba(239,159,39,0.28)',
  UNAVAILABLE: 'rgba(226,75,74,0.22)',
}

const EVIDENCE: Record<string, Array<{ id: string; source: string; trust: number; lastSync: string; status: 'Active' | 'Inactive' }>> = {
  m365: [
    { id: 'e1', source: 'Graph API — user activity', trust: 96, lastSync: '8m ago', status: 'Active' },
    { id: 'e2', source: 'Licence assignment export', trust: 92, lastSync: '1h ago', status: 'Active' },
    { id: 'e3', source: 'Sign-in logs (Entra ID)', trust: 88, lastSync: '2h ago', status: 'Active' },
  ],
  aws: [
    { id: 'e1', source: 'Cost Explorer API', trust: 99, lastSync: '12m ago', status: 'Active' },
    { id: 'e2', source: 'IAM access advisor', trust: 82, lastSync: '3h ago', status: 'Active' },
  ],
  default: [
    { id: 'e1', source: 'Usage API v2', trust: 99, lastSync: '12m ago', status: 'Active' },
    { id: 'e2', source: 'Entitlement export', trust: 87, lastSync: '1h ago', status: 'Active' },
  ],
}

function getEvidence(name: string) {
  const n = name.toLowerCase()
  if (n.includes('m365') || n.includes('microsoft') || n.includes('365')) return EVIDENCE.m365
  if (n.includes('aws') || n.includes('amazon')) return EVIDENCE.aws
  return EVIDENCE.default
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); if (!disabled) onChange(!checked) }}
      style={{
        width: 32, height: 18, borderRadius: 9,
        background: checked ? '#1D9E75' : 'rgba(255,255,255,0.10)',
        border: `0.5px solid ${checked ? 'rgba(29,158,117,0.45)' : 'rgba(255,255,255,0.14)'}`,
        position: 'relative', cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.15s', opacity: disabled ? 0.55 : 1, flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: checked ? 15 : 2,
        width: 12, height: 12, borderRadius: '50%', background: '#fff',
        transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.40)',
      }} />
    </div>
  )
}

function StatusPill({ health }: { health: ConnectorHealth }) {
  const p = PILL[health]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: p.bg, border: `0.5px solid ${p.border}`, color: p.color }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
      {p.label}
    </span>
  )
}

export default function ConnectorHub() {
  const runtime = useRuntimeContext()
  const isDemo = runtime.environment === 'DEMO'
  const runtimeOptions = { environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }
  const { data } = useQuery({ queryKey: ['connectors-hub', runtime.environment], queryFn: () => loadConnectorHubState(runtimeOptions) })
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<string | null>(null)

  if (!data) return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>Loading connectors…</div>
    </Shell>
  )

  const connectors = data.connectors as ConnectorItem[]

  return (
    <Shell>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Page header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#0a0c0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDemo ? 10 : 0 }}>
            <h1 style={{ fontSize: 15, fontWeight: 500, color: '#e8e6e0', margin: 0 }}>Connector hub</h1>
            <button
              style={{ fontSize: 12, padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Test all
            </button>
          </div>
          {isDemo && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', background: 'rgba(239,159,39,0.07)', border: '0.5px solid rgba(239,159,39,0.18)', borderRadius: 5, fontSize: 11, color: 'rgba(239,159,39,0.65)' }}>
              DEMO · Synthetic connector states. Production connectors cannot be modified here.
            </div>
          )}
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)' }}>Active connectors</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              {connectors.length} configured · {connectors.filter(c => c.health === 'HEALTHY').length} ready · {connectors.filter(c => c.health === 'DEGRADED').length} degraded · {connectors.filter(c => c.health === 'UNAVAILABLE').length} unavailable
            </span>
          </div>

          {/* Connector card grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
            {connectors.map(c => {
              const Icon = getIcon(c.name)
              const iconColor = getIconColor(c.name)
              const unconfigured = c.health === 'UNAVAILABLE'
              const enabled = toggles[c.id] !== undefined ? toggles[c.id] : !unconfigured
              const isSelected = selected === c.id

              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(isSelected ? null : c.id)}
                  style={{
                    background: isSelected ? 'rgba(29,158,117,0.04)' : 'rgba(255,255,255,0.03)',
                    border: `0.5px solid ${isSelected ? 'rgba(29,158,117,0.35)' : CARD_BORDER[c.health]}`,
                    borderRadius: 10, padding: 16, cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={iconColor} strokeWidth={1.5} />
                    </div>
                    {unconfigured
                      ? <span style={{ fontSize: 10, color: 'rgba(226,75,74,0.70)', fontWeight: 500, letterSpacing: '0.04em' }}>NOT CONFIGURED</span>
                      : <Toggle checked={enabled} onChange={v => setToggles(t => ({ ...t, [c.id]: v }))} disabled={isDemo} />
                    }
                  </div>

                  {/* Name + desc */}
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#e8e6e0', marginBottom: 3 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.33)', marginBottom: 14, lineHeight: 1.6 }}>{getConnectorDesc(c.name)}</div>

                  {/* Footer */}
                  {unconfigured ? (
                    <button
                      onClick={e => e.stopPropagation()}
                      style={{ width: '100%', padding: '7px 0', background: 'rgba(29,158,117,0.09)', border: '0.5px solid rgba(29,158,117,0.28)', borderRadius: 7, fontSize: 12, color: '#1D9E75', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                    >
                      Configure connector →
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <StatusPill health={c.health} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>{getLastSync(c.health)}</span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add connector ghost card */}
            <div
              style={{ background: 'transparent', border: '0.5px dashed rgba(255,255,255,0.09)', borderRadius: 10, padding: 16, minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.20)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.09)'}
            >
              <Plus size={20} color="rgba(255,255,255,0.17)" />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.27)', fontWeight: 500 }}>Add connector</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.17)', textAlign: 'center' }}>Flexera, Datadog, GCP, and more</div>
            </div>
          </div>

          {/* Evidence sources panel (shown when a configured connector is selected) */}
          {selected && (() => {
            const c = connectors.find(x => x.id === selected)
            if (!c || c.health === 'UNAVAILABLE') return null
            const sources = getEvidence(c.name)
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.28)' }}>
                    Evidence sources — {c.name}
                  </span>
                  <button style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 6, color: 'rgba(255,255,255,0.40)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Manage sources
                  </button>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Source', 'Trust score', 'Last sync', 'Status'].map(h => (
                          <th key={h} style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.22)', padding: '8px 14px', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sources.map((s, i) => (
                        <tr key={s.id}>
                          <td style={{ padding: '12px 14px', borderBottom: i < sources.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', color: '#e8e6e0' }}>
                            <RefreshCw size={11} style={{ verticalAlign: 'middle', marginRight: 7, color: 'rgba(255,255,255,0.28)' }} />
                            {s.source}
                          </td>
                          <td style={{ padding: '12px 14px', borderBottom: i < sources.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', color: '#1D9E75', fontWeight: 500 }}>{s.trust}%</td>
                          <td style={{ padding: '12px 14px', borderBottom: i < sources.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', color: 'rgba(255,255,255,0.35)' }}>{s.lastSync}</td>
                          <td style={{ padding: '12px 14px', borderBottom: i < sources.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: s.status === 'Active' ? 'rgba(29,158,117,0.14)' : 'rgba(226,75,74,0.14)', border: `0.5px solid ${s.status === 'Active' ? 'rgba(29,158,117,0.30)' : 'rgba(226,75,74,0.25)'}`, color: s.status === 'Active' ? '#1D9E75' : '#E24B4A' }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.status === 'Active' ? '#1D9E75' : '#E24B4A' }} />
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
      <CommandBar />
    </Shell>
  )
}
