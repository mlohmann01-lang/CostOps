import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyCommandMetrics, normalizeCommandAggregate } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

const emptyCommand = { actions: [], metrics: emptyCommandMetrics, posture: [], priority: [] }

export function useCommandData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const live = useLiveResource({ path: ['/api/recommendations','/api/outcomes/proof/summary','/api/runtime/status','/api/runtime/connectors','/api/events','/api/opportunities'], enabled: workspace.mode === 'live', initialData: emptyCommand, normalizer: normalizeCommandAggregate, isEmpty: (data) => data.actions.length === 0 && data.metrics.totalIdentified === 0 && data.posture.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve({ actions: demo.actions, metrics: demo.commandMetrics, posture: demo.posture, priority: demo.priority }), isEmptyLive: false, data: { actions: demo.actions, metrics: demo.commandMetrics, posture: demo.posture, priority: demo.priority } }
    if (!workspace.dataReady) return { loading: false, error: null, refresh: live.refresh, isEmptyLive: true, data: emptyCommand }
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: live.isEmpty, data: live.data }
  }, [workspace, demo, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
