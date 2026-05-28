import { useMemo } from 'react'
import { demoSecurity } from '../data/demo'
import { useWorkspace } from '../lib/workspaceContext'

const emptySecurity = {
  roles: [],
  sessions: [],
  tenant: { tenantId: '', isolation: '', authMode: '', executionBoundary: '' },
}

export function useSecurityData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, data: demoSecurity }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, data: emptySecurity }
    return { loading: false, isEmptyLive: false, data: emptySecurity }
  }, [workspace])
}
