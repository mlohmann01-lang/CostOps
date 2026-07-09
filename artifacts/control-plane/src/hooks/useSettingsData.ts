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

export type SettingsDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export function useSettingsData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, dataState: 'DEMO' as SettingsDataState, data: demoSettings, readOnly: true }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, dataState: 'NOT_CONNECTED' as SettingsDataState, data: emptySettings, readOnly: false }
    return { loading: false, isEmptyLive: false, dataState: 'NO_DATA' as SettingsDataState, data: emptySettings, readOnly: false }
  }, [workspace])
}
