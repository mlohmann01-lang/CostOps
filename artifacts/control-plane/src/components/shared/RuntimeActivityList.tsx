import type { RuntimeEvent } from '../../types/runtimeEvents'
import { PlatformEventTimeline } from './PlatformEventTimeline'

export function RuntimeActivityList({ events, limit = 5, emptyLabel, compact }: { events: RuntimeEvent[]; limit?: number; emptyLabel: string; compact?: boolean }) {
  return <PlatformEventTimeline events={events} limit={limit} emptyLabel={emptyLabel} compact={compact} />
}
