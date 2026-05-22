import type { ReadinessState } from '../../types/connector'

const CONFIG: Record<ReadinessState, { bg: string; text: string; dot: string; label: string }> = {
  READY:       { bg: 'var(--c-teal-50)',   text: 'var(--c-teal-600)',   dot: 'var(--c-teal-400)',  label: 'Ready' },
  DEGRADED:    { bg: 'var(--c-amber-50)',  text: 'var(--c-amber-600)',  dot: 'var(--c-amber-400)', label: 'Degraded' },
  UNAVAILABLE: { bg: 'var(--c-red-50)',    text: 'var(--c-red-600)',    dot: 'var(--c-red-400)',   label: 'Unavailable' },
  OFF:         { bg: 'var(--c-gray-50)',   text: 'var(--c-gray-600)',   dot: 'var(--c-gray-400)',  label: 'Off' },
}

interface ReadinessBadgeProps {
  state: ReadinessState
}

export function ReadinessBadge({ state }: ReadinessBadgeProps) {
  const { bg, text, dot, label } = CONFIG[state]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 500,
      padding: '2px 7px', borderRadius: 10,
      background: bg, color: text,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
      {label}
    </span>
  )
}
