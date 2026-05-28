import { useMemo } from 'react'
import { demoSettings } from '../data/demo'
import { useWorkspace } from '../lib/workspaceContext'

const emptySettings = {
  workspace: { tenantName: '', tenantId: '', mode: '', liveExecution: '' },
  governanceDefaults: {},
  notifications: {},
  retention: {},
  dangerZone: {},
}

export function useSettingsData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, data: demoSettings, readOnly: true }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, data: emptySettings, readOnly: false }
    return { loading: false, isEmptyLive: false, data: emptySettings, readOnly: false }
  }, [workspace])
}
