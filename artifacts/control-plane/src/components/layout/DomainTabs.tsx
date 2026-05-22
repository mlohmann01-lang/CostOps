import { useLocation } from 'wouter'
import { DOMAINS } from '../../types/domain'
import type { Domain } from '../../types/connector'
import type { ConnectorConfig, ReadinessState } from '../../types/connector'

function worstReadiness(connectors: ConnectorConfig[], domain: Domain): ReadinessState {
  const relevant = domain === 'all' ? connectors : connectors.filter(c => {
    if (domain === 'cloud') return c.domain === 'cloud'
    return c.domain === domain
  })
  if (relevant.some(c => c.readiness === 'UNAVAILABLE')) return 'UNAVAILABLE'
  if (relevant.some(c => c.readiness === 'DEGRADED')) return 'DEGRADED'
  if (relevant.some(c => c.readiness === 'READY')) return 'READY'
  return 'OFF'
}

function dotColor(state: ReadinessState): string {
  if (state === 'READY') return 'var(--c-teal-400)'
  if (state === 'DEGRADED') return 'var(--c-amber-400)'
  if (state === 'UNAVAILABLE') return 'var(--c-red-400)'
  return 'var(--c-gray-400)'
}

interface DomainTabsProps {
  connectors: ConnectorConfig[]
  currentDomain: Domain
  basePath: string
}

export function DomainTabs({ connectors, currentDomain, basePath }: DomainTabsProps) {
  const [, navigate] = useLocation()

  return (
    <div style={{ display: 'flex', gap: 0 }} role="tablist">
      {DOMAINS.map(d => {
        const active = d.id === currentDomain
        const state = worstReadiness(connectors, d.id)
        return (
          <button
            key={d.id}
            role="tab"
            aria-selected={active}
            onClick={() => navigate(basePath.replace(':domain', d.id))}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              cursor: 'pointer',
              border: 'none',
              borderBottom: active ? '2px solid var(--c-teal-400)' : '2px solid transparent',
              background: 'none',
              color: active ? 'var(--c-teal-600)' : 'var(--text-secondary)',
              fontWeight: active ? 500 : 400,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
              transition: 'color 0.1s, border-color 0.1s',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor(state), flexShrink: 0 }} />
            {d.label}
          </button>
        )
      })}
    </div>
  )
}
