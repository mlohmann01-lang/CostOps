import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { demoSchedule } from '../data/demo'
import { emptySchedule, normalizeSchedule } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

export function useSchedulingData(): any {
  const workspace = useWorkspace()
  const live = useLiveResource({ path: '/api/schedules', enabled: workspace.mode === 'live', initialData: emptySchedule, normalizer: normalizeSchedule, isEmpty: (data) => data.upcoming.length === 0 && data.past.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve(demoSchedule), isEmptyLive: false, data: demoSchedule }
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: !workspace.dataReady || live.isEmpty, data: live.data }
  }, [workspace, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
