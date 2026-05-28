import { createContext, useContext, useMemo, useState } from 'react'

export type RuntimeEnvironment = 'DEMO' | 'LIVE'
export type RuntimeTenantMode = 'DEMO' | 'READ_ONLY' | 'GOVERNED_EXECUTION' | 'PRODUCTION'
export type RuntimeConnectorPolicy = { allowSynthetic: boolean; allowLiveConnectors: boolean; requireConnectorHealthForLive: boolean }
export type RuntimeExecutionCapabilities = { liveExecutionEnabled: boolean; simulatedExecutionEnabled: boolean; approvalEnabled: boolean; rollbackEnabled: boolean; dryRunEnabled: boolean }
export interface RuntimeContextValue {
  environment?: RuntimeEnvironment
  tenantId: string
  tenantMode: RuntimeTenantMode
  isDemo: boolean
  isLive: boolean
  selectedAt?: string
  hasSelectedEnvironment: boolean
  executionCapabilities: RuntimeExecutionCapabilities
  connectorPolicy: RuntimeConnectorPolicy
  banner: { label: string; description: string; severity: 'info' | 'warning' | 'success' }
  selectEnvironment: (environment: RuntimeEnvironment) => void
  clearEnvironment: () => void
}

export const RUNTIME_ENVIRONMENT_STORAGE_KEY = 'certen.runtimeEnvironment'
const SELECTED_AT_KEY = 'certen.runtimeEnvironmentSelectedAt'

// Runtime environment is per-session — cleared when the tab closes so workspace
// selection is always shown after a fresh login.
const runtimeStore: Pick<Storage, 'getItem'|'setItem'|'removeItem'> = typeof sessionStorage === 'undefined' ? { getItem: () => null, setItem: () => {}, removeItem: () => {} } : sessionStorage

const DEMO_RUNTIME_CONTEXT = {
  environment: 'DEMO' as RuntimeEnvironment, tenantId: 'demo-sandbox-tenant', tenantMode: 'DEMO' as RuntimeTenantMode,
  executionCapabilities: { liveExecutionEnabled: false, simulatedExecutionEnabled: true, approvalEnabled: true, rollbackEnabled: true, dryRunEnabled: true },
  connectorPolicy: { allowSynthetic: true, allowLiveConnectors: false, requireConnectorHealthForLive: false },
  banner: { label: 'DEMO WORKSPACE', description: 'Synthetic evidence only. No production systems connected. Live execution disabled.', severity: 'info' as const },
}

const LIVE_RUNTIME_CONTEXT = {
  environment: 'LIVE' as RuntimeEnvironment, tenantId: 'live-tenant', tenantMode: 'READ_ONLY' as RuntimeTenantMode,
  executionCapabilities: { liveExecutionEnabled: false, simulatedExecutionEnabled: false, approvalEnabled: true, rollbackEnabled: true, dryRunEnabled: true },
  connectorPolicy: { allowSynthetic: false, allowLiveConnectors: true, requireConnectorHealthForLive: true },
  banner: { label: 'LIVE WORKSPACE', description: 'Connected to real enterprise systems. Governed actions are subject to trust, approval, connector health, and policy controls.', severity: 'warning' as const },
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null)

export function RuntimeContextProvider({ children }: { children: React.ReactNode }) {
  const initial = (runtimeStore.getItem(RUNTIME_ENVIRONMENT_STORAGE_KEY) as RuntimeEnvironment | null) ?? undefined
  const [environment, setEnvironment] = useState<RuntimeEnvironment | undefined>(initial)
  const selectedAt = runtimeStore.getItem(SELECTED_AT_KEY) ?? undefined

  const value = useMemo<RuntimeContextValue>(() => {
    const base = environment === 'LIVE' ? LIVE_RUNTIME_CONTEXT : DEMO_RUNTIME_CONTEXT
    const now = new Date().toISOString()
    const select = (next: RuntimeEnvironment) => {
      runtimeStore.setItem(RUNTIME_ENVIRONMENT_STORAGE_KEY, next)
      runtimeStore.setItem(SELECTED_AT_KEY, now)
      setEnvironment(next)
    }
    const clear = () => {
      runtimeStore.removeItem(RUNTIME_ENVIRONMENT_STORAGE_KEY)
      runtimeStore.removeItem(SELECTED_AT_KEY)
      setEnvironment(undefined)
    }
    if (!environment) {
      return {
        environment: undefined, tenantId: '', tenantMode: 'READ_ONLY', isDemo: false, isLive: false,
        selectedAt: undefined, hasSelectedEnvironment: false,
        executionCapabilities: LIVE_RUNTIME_CONTEXT.executionCapabilities,
        connectorPolicy: LIVE_RUNTIME_CONTEXT.connectorPolicy,
        banner: { label: 'WORKSPACE REQUIRED', description: 'Select Demo or Live Workspace to continue.', severity: 'info' },
        selectEnvironment: select,
        clearEnvironment: clear,
      }
    }
    return {
      environment, tenantId: base.tenantId, tenantMode: base.tenantMode,
      isDemo: environment === 'DEMO', isLive: environment === 'LIVE',
      selectedAt, hasSelectedEnvironment: true,
      executionCapabilities: base.executionCapabilities,
      connectorPolicy: base.connectorPolicy,
      banner: base.banner,
      selectEnvironment: select,
      clearEnvironment: clear,
    }
  }, [environment, selectedAt])

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}

export function useRuntimeContext() {
  const ctx = useContext(RuntimeContext)
  if (!ctx) throw new Error('useRuntimeContext must be used inside RuntimeContextProvider')
  return ctx
}
