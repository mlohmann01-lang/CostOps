import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { fetchRuntimeEvents, subscribeRuntimeEvents } from '../lib/liveRuntimeEvents'
import { useWorkspace } from '../lib/workspaceContext'
import type { RuntimeEvent, RuntimeEventCategory, RuntimeEventSeverity, RuntimeEventType } from '../types/runtimeEvents'
import type { ActivityCategory, DemoActivityEvent } from '../lib/demoRuntimeStore'

const categoryMap: Record<ActivityCategory, RuntimeEventCategory> = {
  approval: 'APPROVAL',
  execution: 'EXECUTION',
  rollback: 'EXECUTION',
  drift: 'DRIFT',
  connector: 'CONNECTOR',
  evidence: 'AUDIT',
  governance: 'GOVERNANCE',
}

const typeMap: Record<ActivityCategory, RuntimeEventType> = {
  approval: 'APPROVAL_GRANTED',
  execution: 'EXECUTION_COMPLETED',
  rollback: 'EXECUTION_REQUESTED',
  drift: 'DRIFT_RESOLVED',
  connector: 'CONNECTOR_DEGRADED',
  evidence: 'AUDIT_PACK_GENERATED',
  governance: 'GOVERNANCE_POLICY_CHANGED',
}

function demoSeverity(category: ActivityCategory): RuntimeEventSeverity {
  if (category === 'connector') return 'warning'
  if (category === 'rollback') return 'info'
  return 'success'
}

export function demoActivityToRuntimeEvent(event: DemoActivityEvent, tenantId: string): RuntimeEvent {
  return {
    eventId: event.id,
    tenantId,
    category: categoryMap[event.category],
    type: typeMap[event.category],
    entityType: event.category,
    entityId: event.id,
    message: event.message,
    severity: demoSeverity(event.category),
    createdAt: new Date(event.timestamp).toISOString(),
    payload: { demo: true, at: event.at },
  }
}

export type RuntimeEventsDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export function useRuntimeEvents() {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const [events, setEvents] = useState<RuntimeEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dataState, setDataState] = useState<RuntimeEventsDataState>('NOT_CONNECTED')

  const demoEvents = useMemo(() => demo.activity.map((event) => demoActivityToRuntimeEvent(event, workspace.tenantId)), [demo.activity, workspace.tenantId])

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') {
      setError(null)
      setLastUpdated(new Date())
      setDataState('DEMO')
      return demoEvents
    }
    if (!workspace.dataReady) {
      setEvents([])
      setError(null)
      setLastUpdated(null)
      setDataState('NOT_CONNECTED')
      return []
    }
    setLoading(true)
    try {
      const next = await fetchRuntimeEvents({ tenantId: workspace.tenantId })
      setEvents(next)
      setError(null)
      setLastUpdated(new Date())
      setDataState(next.length === 0 ? 'NO_DATA' : 'LIVE')
      return next
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error(String(err))
      setError(nextError)
      setEvents([])
      setDataState('NO_DATA')
      return []
    } finally {
      setLoading(false)
    }
  }, [demoEvents, workspace.dataReady, workspace.mode, workspace.tenantId])

  useEffect(() => {
    if (workspace.mode === 'demo') {
      setEvents([])
      setError(null)
      setLoading(false)
      setDataState('DEMO')
      return undefined
    }
    if (!workspace.dataReady) {
      setEvents([])
      setError(null)
      setLoading(false)
      setLastUpdated(null)
      setDataState('NOT_CONNECTED')
      return undefined
    }
    setLoading(true)
    return subscribeRuntimeEvents({
      workspace,
      onEvents: (next) => {
        setEvents(next)
        setError(null)
        setLoading(false)
        setLastUpdated(new Date())
        setDataState(next.length === 0 ? 'NO_DATA' : 'LIVE')
      },
      onError: (nextError) => {
        setEvents([])
        setError(nextError)
        setLoading(false)
        setDataState('NO_DATA')
      },
    })
  }, [workspace])

  const visibleEvents = workspace.mode === 'demo' ? demoEvents : events
  return {
    events: visibleEvents,
    latestEvents: visibleEvents.slice(0, 5),
    loading,
    error,
    lastUpdated,
    dataState,
    refresh,
  }
}
