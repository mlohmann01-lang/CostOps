import { AlertTriangle } from 'lucide-react'

interface AlertBarProps {
  connectorName: string
  reason: string
  onReconfigure?: () => void
}

export function AlertBar({ connectorName, reason, onReconfigure }: AlertBarProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--c-amber-50)',
      border: '0.5px solid var(--c-amber-400)',
      borderRadius: 8, padding: '9px 14px',
      marginBottom: 16, fontSize: 12,
      color: 'var(--c-amber-800)',
    }} role="alert">
      <AlertTriangle size={15} color="var(--c-amber-400)" style={{ flexShrink: 0 }} />
      <span>
        <strong>{connectorName} connector degraded</strong> — {reason}.{' '}
        {onReconfigure && (
          <button
            onClick={onReconfigure}
            style={{
              color: 'var(--c-amber-600)', fontWeight: 500, cursor: 'pointer',
              textDecoration: 'underline', border: 'none', background: 'none',
              padding: 0, fontFamily: 'inherit', fontSize: 12,
            }}
          >
            Reconfigure →
          </button>
        )}
      </span>
    </div>
  )
}
