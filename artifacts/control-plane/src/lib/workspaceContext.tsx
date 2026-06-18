import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRuntimeContext } from './runtimeContext'
import { liveFetch } from './liveApi'
import type { WorkspaceContext as WorkspaceContextType } from '../types/workspace'

export const WorkspaceReactContext = createContext<WorkspaceContextType | null>(null)

export function deriveWorkspace(runtime: { environment?: string; tenantId: string }, dataReady = false): WorkspaceContextType {
  return {
    mode: runtime.environment === 'LIVE' ? 'live' : 'demo',
    tenantId: runtime.tenantId || 'demo-sandbox-tenant',
    tenantName: runtime.environment === 'LIVE' ? 'Live workspace' : 'Demo workspace',
    dataReady: runtime.environment === 'LIVE' ? dataReady : true,
  }
}

/**
 * "dataReady" means a tenant has at least one connected, healthy connector — i.e. there is
 * real data to read. It is derived from /api/connectors rather than hardcoded, so live mode
 * actually serves live data once a connector is connected instead of permanently falling
 * back to demo content.
 */
function useLiveDataReady(isLive: boolean): boolean {
  const [dataReady, setDataReady] = useState(false)
  useEffect(() => {
    if (!isLive) { setDataReady(false); return undefined }
    let cancelled = false
    const check = async () => {
      try {
        const connectors = await liveFetch<Array<{ status?: string }>>('/api/connectors')
        const connected = Array.isArray(connectors) && connectors.some((c) => String(c.status).toLowerCase() === 'connected')
        if (!cancelled) setDataReady(connected)
      } catch {
        if (!cancelled) setDataReady(false)
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
  return dataReady
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const runtime = useRuntimeContext()
  const isLive = runtime.environment === 'LIVE'
  const liveDataReady = useLiveDataReady(isLive)
  const value = useMemo<WorkspaceContextType>(() => deriveWorkspace(runtime, liveDataReady), [runtime.environment, runtime.tenantId, liveDataReady])

  return <WorkspaceReactContext.Provider value={value}>{children}</WorkspaceReactContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceReactContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
