import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { demoCampaigns } from '../data/demo'

export function useCampaignsData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, data: demoCampaigns }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, data: [] }
    return { loading: false, isEmptyLive: false, data: [] }
  }, [workspace])
}
