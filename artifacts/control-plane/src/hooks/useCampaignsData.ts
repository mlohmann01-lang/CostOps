import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { normalizeCampaigns } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

export function useCampaignsData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const live = useLiveResource({ path: '/api/campaigns', enabled: workspace.mode === 'live', initialData: [], normalizer: normalizeCampaigns, isEmpty: (data) => data.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve(demo.campaigns), isEmptyLive: false, data: demo.campaigns }
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: !workspace.dataReady || live.isEmpty, data: live.data }
  }, [workspace, demo, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
