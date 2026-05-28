import { createContext, useContext, useMemo } from 'react'
import { useRuntimeContext } from './runtimeContext'
import type { WorkspaceContext as WorkspaceContextType } from '../types/workspace'

export const WorkspaceReactContext = createContext<WorkspaceContextType | null>(null)

export function deriveWorkspace(runtime: { environment?: string; tenantId: string }): WorkspaceContextType {
  return {
    mode: runtime.environment === 'LIVE' ? 'live' : 'demo',
    tenantId: runtime.tenantId || 'demo-sandbox-tenant',
    tenantName: runtime.environment === 'LIVE' ? 'Live workspace' : 'Demo workspace',
    dataReady: runtime.environment === 'LIVE' ? false : true,
  }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const runtime = useRuntimeContext()
  const value = useMemo<WorkspaceContextType>(() => ({
    mode: runtime.environment === 'LIVE' ? 'live' : 'demo',
    tenantId: runtime.tenantId || 'demo-sandbox-tenant',
    tenantName: runtime.environment === 'LIVE' ? 'Live workspace' : 'Demo workspace',
    dataReady: runtime.environment === 'LIVE' ? false : true,
  }), [runtime.environment, runtime.tenantId])

  return <WorkspaceReactContext.Provider value={value}>{children}</WorkspaceReactContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceReactContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
