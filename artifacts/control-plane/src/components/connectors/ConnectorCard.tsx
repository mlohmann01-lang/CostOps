import { Brain, Cloud, Globe, Monitor, Database, AppWindow } from 'lucide-react'
import { ReadinessBadge } from '../shared/ReadinessBadge'
import { formatRelativeTime } from '../../lib/formatters'
import type { ConnectorConfig } from '../../types/connector'

const ICON_MAP: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  'ai':        { icon: Brain,     bg: 'var(--c-teal-50)',   color: 'var(--c-teal-600)' },
  'cloud-aws': { icon: Cloud,     bg: 'var(--c-amber-50)',  color: 'var(--c-amber-600)' },
  'cloud-az':  { icon: Globe,     bg: 'var(--c-blue-50)',   color: 'var(--c-blue-600)' },
  'saas':      { icon: AppWindow, bg: 'var(--c-purple-50)', color: 'var(--c-purple-600)' },
  'itam':      { icon: Monitor,   bg: 'var(--c-gray-50)',   color: 'var(--c-gray-600)' },
  'data':      { icon: Database,  bg: 'var(--c-pink-50)',   color: 'var(--c-pink-600)' },
}

interface ConnectorCardProps {
  connector: ConnectorConfig
  selected: boolean
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}

export function ConnectorCard({ connector, selected, onSelect, onToggle }: ConnectorCardProps) {
  const { icon: Icon, bg, color } = ICON_MAP[connector.iconType] ?? ICON_MAP['data']

  return (
    <div
      role="listitem"
      tabIndex={0}
      onClick={() => onSelect(connector.id)}
      onKeyDown={e => e.key === 'Enter' && onSelect(connector.id)}
      style={{
        background: 'var(--surface-0)',
        border: selected ? '1.5px solid var(--c-teal-400)' : '0.5px solid var(--border-subtle)',
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        opacity: connector.readiness === 'UNAVAILABLE' ? 0.75 : 1,
        transition: 'border-color 0.12s',
      }}
    >
      {/* Head row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: bg, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} />
        </div>
        {/* Toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(connector.id) }}
          aria-label={`Toggle ${connector.name}`}
          style={{
            width: 30, height: 17, borderRadius: 9, border: 'none',
            cursor: 'pointer',
            position: 'relative',
            background: connector.enabled ? 'var(--c-teal-400)' : 'var(--c-gray-400)',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            width: 13, height: 13, borderRadius: '50%', background: '#fff',
            top: 2,
            left: connector.enabled ? 15 : 2,
            transition: 'left 0.15s',
          }} />
        </button>
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
        {connector.name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        {connector.description}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 10, paddingTop: 10,
        borderTop: '0.5px solid var(--border-subtle)',
      }}>
        <ReadinessBadge state={connector.readiness} />
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {connector.lastSyncAt ? `Synced ${formatRelativeTime(connector.lastSyncAt)}` : 'Not configured'}
        </span>
      </div>
    </div>
  )
}
