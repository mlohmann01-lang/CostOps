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
  const initial = (localStorage.getItem(RUNTIME_ENVIRONMENT_STORAGE_KEY) as RuntimeEnvironment | null) ?? undefined
  const [environment, setEnvironment] = useState<RuntimeEnvironment | undefined>(initial)
  const selectedAt = localStorage.getItem(SELECTED_AT_KEY) ?? undefined

  const value = useMemo<RuntimeContextValue>(() => {
    const base = environment === 'LIVE' ? LIVE_RUNTIME_CONTEXT : DEMO_RUNTIME_CONTEXT
    if (!environment) {
      return {
        environment: undefined, tenantId: '', tenantMode: 'READ_ONLY', isDemo: false, isLive: false, selectedAt: undefined, hasSelectedEnvironment: false,
        executionCapabilities: LIVE_RUNTIME_CONTEXT.executionCapabilities,
        connectorPolicy: LIVE_RUNTIME_CONTEXT.connectorPolicy,
        banner: { label: 'WORKSPACE REQUIRED', description: 'Select Demo Workspace or Live Workspace to continue.', severity: 'info' },
        selectEnvironment: (next) => { localStorage.setItem(RUNTIME_ENVIRONMENT_STORAGE_KEY, next); localStorage.setItem(SELECTED_AT_KEY, '2026-05-01T09:00:00.000Z'); setEnvironment(next) },
        clearEnvironment: () => { localStorage.removeItem(RUNTIME_ENVIRONMENT_STORAGE_KEY); localStorage.removeItem(SELECTED_AT_KEY); setEnvironment(undefined) },
      }
    }
    return {
      environment,
      tenantId: base.tenantId,
      tenantMode: base.tenantMode,
      isDemo: environment === 'DEMO',
      isLive: environment === 'LIVE',
      selectedAt,
      hasSelectedEnvironment: true,
      executionCapabilities: base.executionCapabilities,
      connectorPolicy: base.connectorPolicy,
      banner: base.banner,
      selectEnvironment: (next) => { localStorage.setItem(RUNTIME_ENVIRONMENT_STORAGE_KEY, next); localStorage.setItem(SELECTED_AT_KEY, '2026-05-01T09:00:00.000Z'); setEnvironment(next) },
      clearEnvironment: () => { localStorage.removeItem(RUNTIME_ENVIRONMENT_STORAGE_KEY); localStorage.removeItem(SELECTED_AT_KEY); setEnvironment(undefined) },
    }
  }, [environment, selectedAt])

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}

export function useRuntimeContext() {
  const ctx = useContext(RuntimeContext)
  if (!ctx) throw new Error('useRuntimeContext must be used inside RuntimeContextProvider')
  return ctx
}
