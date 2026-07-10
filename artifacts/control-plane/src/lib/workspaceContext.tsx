import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRuntimeContext } from './runtimeContext'
import { liveFetch } from './liveApi'
import type { WorkspaceContext as WorkspaceContextType, WorkspaceRuntimeState } from '../types/workspace'

export type { WorkspaceRuntimeState }
export type { WorkspaceContext as WorkspaceContextType } from '../types/workspace'

export const WorkspaceReactContext = createContext<WorkspaceContextType | null>(null)

export function deriveWorkspace(
  runtime: { environment?: string; tenantId: string },
  dataReady = false,
  connectedCount = 0,
  hasOutcomes = false,
): WorkspaceContextType {
  const mode: WorkspaceContextType['mode'] = runtime.environment === 'LIVE' ? 'live' : 'demo'
  const runtimeState: WorkspaceRuntimeState =
    mode === 'demo'
      ? 'DEMO'
      : connectedCount === 0
        ? 'LIVE_UNCONNECTED'
        : !hasOutcomes
          ? 'LIVE_DISCOVERING'
          : 'LIVE_OPERATIONAL'

  return {
    mode,
    tenantId: runtime.tenantId || 'demo-sandbox-tenant',
    tenantName: runtime.environment === 'LIVE' ? 'Live workspace' : 'Demo workspace',
    dataReady: runtime.environment === 'LIVE' ? dataReady : true,
    runtimeState,
    connectedCount: mode === 'live' ? connectedCount : 0,
  }
}

type LiveDataInfo = {
  dataReady: boolean
  connectedCount: number
  hasOutcomes: boolean
}

/**
 * Polls /api/connectors and /api/outcomes/summary to derive richer live state.
 * dataReady = at least one connector is 'connected'
 * connectedCount = number of connectors with status 'connected'
 * hasOutcomes = totalMonthlySaving > 0 (proxy for "discovery+execution complete")
 */
function useLiveData(isLive: boolean): LiveDataInfo {
  const [info, setInfo] = useState<LiveDataInfo>({ dataReady: false, connectedCount: 0, hasOutcomes: false })

  useEffect(() => {
    if (!isLive) {
      setInfo({ dataReady: false, connectedCount: 0, hasOutcomes: false })
      return undefined
    }
    let cancelled = false
    const check = async () => {
      try {
        const [connectors, outcomeSummary] = await Promise.all([
          liveFetch<Array<{ status?: string }>>('/api/connectors'),
          liveFetch<{ totalMonthlySaving?: number }>('/api/outcomes/summary').catch(() => ({})),
        ])
        const connected = Array.isArray(connectors)
          ? connectors.filter((c) => String(c.status ?? '').toLowerCase() === 'connected')
          : []
        const count = connected.length
        const hasOutcomes = Number((outcomeSummary as { totalMonthlySaving?: number }).totalMonthlySaving ?? 0) > 0
        if (!cancelled) setInfo({ dataReady: count > 0, connectedCount: count, hasOutcomes })
      } catch {
        if (!cancelled) setInfo({ dataReady: false, connectedCount: 0, hasOutcomes: false })
      }
    }
    void check()
    const onRefresh = () => void check()
    if (typeof window !== 'undefined') window.addEventListener('certen:live-read-refresh', onRefresh)
    const timer = setInterval(check, 30000)
    return () => {
      cancelled = true
      if (typeof window !== 'undefined') window.removeEventListener('certen:live-read-refresh', onRefresh)
      clearInterval(timer)
    }
  }, [isLive])

  return info
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const runtime = useRuntimeContext()
  const isLive = runtime.environment === 'LIVE'
  const liveData = useLiveData(isLive)
  const value = useMemo<WorkspaceContextType>(
    () => deriveWorkspace(runtime, liveData.dataReady, liveData.connectedCount, liveData.hasOutcomes),
    [runtime.environment, runtime.tenantId, liveData.dataReady, liveData.connectedCount, liveData.hasOutcomes],
  )

  return <WorkspaceReactContext.Provider value={value}>{children}</WorkspaceReactContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceReactContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
