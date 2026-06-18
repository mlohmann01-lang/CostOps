import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'

export type CapabilityLevel = 'LIVE' | 'SIMULATED' | 'STUB'
export type ConnectorHealth = 'HEALTHY' | 'WARNING' | 'ERROR' | 'NOT_CONNECTED'
export type RegistryDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export type ConnectorCapabilityEntry = {
  type: string
  name: string
  discovery: CapabilityLevel
  execution: CapabilityLevel
  verification: CapabilityLevel
  health: ConnectorHealth
}

export const connectorCapabilityMatrix: Record<string, { name: string; discovery: CapabilityLevel; execution: CapabilityLevel; verification: CapabilityLevel }> = {
  m365: { name: 'Microsoft 365', discovery: 'LIVE', execution: 'LIVE', verification: 'LIVE' },
  flexera: { name: 'Flexera', discovery: 'SIMULATED', execution: 'SIMULATED', verification: 'SIMULATED' },
  servicenow: { name: 'ServiceNow', discovery: 'SIMULATED', execution: 'SIMULATED', verification: 'SIMULATED' },
  aws: { name: 'AWS', discovery: 'STUB', execution: 'STUB', verification: 'STUB' },
  snowflake: { name: 'Snowflake', discovery: 'STUB', execution: 'STUB', verification: 'STUB' },
  databricks: { name: 'Databricks', discovery: 'STUB', execution: 'STUB', verification: 'STUB' },
}

function healthFromStatus(status?: string): ConnectorHealth {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'connected') return 'HEALTHY'
  if (normalized === 'syncing' || normalized === 'pending') return 'WARNING'
  if (normalized === 'error' || normalized === 'failed') return 'ERROR'
  return 'NOT_CONNECTED'
}

function buildRegistry(liveConnectors: Array<{ type: string; status?: string }>): ConnectorCapabilityEntry[] {
  const byType = new Map(liveConnectors.map((c) => [String(c.type).toLowerCase(), c]))
  return Object.entries(connectorCapabilityMatrix).map(([type, capability]) => ({
    type,
    name: capability.name,
    discovery: capability.discovery,
    execution: capability.execution,
    verification: capability.verification,
    health: healthFromStatus(byType.get(type)?.status),
  }))
}

export function useConnectorCapabilityRegistry() {
  const workspace = useWorkspace()
  const [entries, setEntries] = useState<ConnectorCapabilityEntry[]>(() => buildRegistry([]))
  const [dataState, setDataState] = useState<RegistryDataState>('DEMO')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') {
      setEntries(buildRegistry([{ type: 'm365', status: 'connected' }]))
      setDataState('DEMO')
      setError(undefined)
      return
    }
    if (!workspace.dataReady) {
      setEntries(buildRegistry([]))
      setDataState('NOT_CONNECTED')
      setError(undefined)
      return
    }
    setLoading(true)
    try {
      const connectors = await liveFetch<Array<{ type: string; status?: string }>>('/api/connectors')
      setEntries(buildRegistry(Array.isArray(connectors) ? connectors : []))
      setDataState('LIVE')
      setError(undefined)
    } catch (err) {
      setEntries(buildRegistry([]))
      setDataState('NO_DATA')
      setError(normalizeApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])

  return { entries, dataState, loading, error, refresh }
}
