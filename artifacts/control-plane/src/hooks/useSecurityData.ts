import { useMemo } from 'react'
import { demoSecurity } from '../data/demo'
import { useWorkspace } from '../lib/workspaceContext'

const emptySecurity = {
  roles: [],
  sessions: [],
  tenant: { tenantId: '', isolation: '', authMode: '', executionBoundary: '' },
}

export type SecurityDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export function useSecurityData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, dataState: 'DEMO' as SecurityDataState, data: demoSecurity }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, dataState: 'NOT_CONNECTED' as SecurityDataState, data: emptySecurity }
    return { loading: false, isEmptyLive: false, dataState: 'NO_DATA' as SecurityDataState, data: emptySecurity }
  }, [workspace])
}
