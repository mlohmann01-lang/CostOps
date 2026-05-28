import { useMemo } from 'react'
import { demoConnectorOps } from '../data/demo'
import { useWorkspace } from '../lib/workspaceContext'

const emptyConnectorOps = {
  summary: { configured: 0, healthy: 0, degraded: 0, failedJobs: 0 },
  connectors: [],
}

export function useConnectorOpsData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, data: demoConnectorOps }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, data: emptyConnectorOps }
    return { loading: false, isEmptyLive: false, data: emptyConnectorOps }
  }, [workspace])
}
