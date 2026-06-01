import type { RuntimeEvent } from '../../types/runtimeEvents'

export function PlatformEventTimeline({ events, limit = 10, emptyLabel = 'No platform events yet', compact = false }: { events: RuntimeEvent[]; limit?: number; emptyLabel?: string; compact?: boolean }) {
  const visible = events.slice(0, limit)
  if (!visible.length) return <p style={{ color: 'var(--text-secondary)' }}>{emptyLabel}</p>
  return <div data-testid='platform-event-timeline'>{visible.map((event) => <div key={event.eventId} style={{ padding: compact ? '6px 0' : '10px 0', borderTop: 'var(--border-subtle)' }}><strong>{event.message}</strong><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{event.category} · {event.type} · {event.severity} · {event.createdAt}</div></div>)}</div>
}
