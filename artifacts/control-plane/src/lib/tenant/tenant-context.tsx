import { createContext, useContext } from 'react'
import { useAuth } from '../auth/auth-provider'

const TenantContext = createContext<any>(null)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const value = session ? {
    tenantId: session.tenantId,
    tenantName: session.tenantName,
    tenantMode: session.tenantMode,
    environment: session.environment,
    role: session.role,
    liveExecutionEnabled: session.liveExecutionEnabled,
    connectorMode: session.connectorMode,
  } : null
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
  return useContext(TenantContext)
}
