import { useCallback, useEffect, useState } from 'react'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'
import { liveTenantReadinessDemoSeed } from '../lib/demo-seed/liveTenantReadinessDemoSeed'

export type TenantRuntimeMode = 'DEMO' | 'PILOT_READ_ONLY' | 'PILOT_CONTROLLED_EXECUTION' | 'PRODUCTION_CONTROLLED_EXECUTION'
export type ConnectorHealthReport = { tenantId: string; connectorId: string; connectorType: 'M365' | 'AI' | 'SERVICENOW' | 'AWS' | 'AZURE'; status: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED' | 'EXPIRED_CREDENTIALS' | 'MISSING_SCOPES' | 'RATE_LIMITED'; lastCheckedAt: string; credentialExpiresAt?: string; scopes?: string[]; missingScopes?: string[]; rateLimitResetAt?: string; errors: string[] }
export type TenantExecutionPolicy = { tenantId: string; mode: TenantRuntimeMode; allowRealWrites: boolean; allowDryRun: boolean; requireApprovalAuthority: boolean; requireTrustAuthority: boolean; requireEvidence: boolean; requireRollbackForDestructive: boolean; maxBlastRadiusAllowed: 'LOW' | 'MEDIUM' | 'HIGH'; allowedDomains: Array<'M365' | 'AI' | 'SERVICENOW' | 'AWS' | 'AZURE'>; createdAt: string; updatedAt: string }
export type EvidenceExportReadiness = { tenantId: string; actionId?: string; wedge: 'M365' | 'AI' | 'SERVICENOW' | 'AWS' | 'AZURE'; ready: boolean; missing: string | null; missingItems: string[]; generatedAt: string }
export type LiveTenantReadinessDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'
export type LiveTenantReadinessData = { readiness: { tenantId: string; mode: TenantRuntimeMode; certifiedWedges: { m365: boolean; ai: boolean; servicenow: boolean; aws?: boolean; azure?: boolean }; connectorHealth: ConnectorHealthReport[]; executionGateSummary: { allowed: number; blocked: number; dryRunOnly: number }; auditCompleteness: { complete: number; incomplete: number }; evidenceExportReadiness: { ready: number; blocked: number }; blockers: string[]; readyForPilot: boolean; readyForProduction: boolean }; tenantExecutionPolicy: TenantExecutionPolicy; connectorHealth: ConnectorHealthReport[]; evidenceExportReadiness: EvidenceExportReadiness[]; isDemo: boolean; dataState: LiveTenantReadinessDataState; loading: boolean; error?: string; refreshConnectorHealth(): Promise<void>; updateTenantExecutionPolicy(input: Partial<TenantExecutionPolicy>): Promise<void> }

export const liveTenantReadinessApiPaths = ['/api/runtime/live-tenant-readiness', '/api/runtime/connector-health', '/api/runtime/evidence-export-readiness', '/api/runtime/tenant-execution-policy'] as const

const emptyLiveTenantReadiness: Omit<LiveTenantReadinessData, 'loading' | 'error' | 'refreshConnectorHealth' | 'updateTenantExecutionPolicy'> = {
  readiness: { tenantId: 'live', mode: 'PILOT_READ_ONLY', certifiedWedges: { m365: false, ai: false, servicenow: false }, connectorHealth: [], executionGateSummary: { allowed: 0, blocked: 0, dryRunOnly: 0 }, auditCompleteness: { complete: 0, incomplete: 0 }, evidenceExportReadiness: { ready: 0, blocked: 0 }, blockers: [], readyForPilot: false, readyForProduction: false },
  tenantExecutionPolicy: { tenantId: 'live', mode: 'PILOT_READ_ONLY', allowRealWrites: false, allowDryRun: true, requireApprovalAuthority: true, requireTrustAuthority: true, requireEvidence: true, requireRollbackForDestructive: true, maxBlastRadiusAllowed: 'LOW', allowedDomains: [], createdAt: '', updatedAt: '' },
  connectorHealth: [],
  evidenceExportReadiness: [],
  isDemo: false,
  dataState: 'NOT_CONNECTED',
}

function normalizeReadinessPayload(payload: any = {}) {
  const readiness = payload.readiness ?? payload.liveTenantReadiness ?? emptyLiveTenantReadiness.readiness
  const connectorHealth = Array.isArray(payload.connectorHealth) ? payload.connectorHealth : Array.isArray(readiness.connectorHealth) ? readiness.connectorHealth : emptyLiveTenantReadiness.connectorHealth
  return { readiness: { ...emptyLiveTenantReadiness.readiness, ...readiness, connectorHealth }, tenantExecutionPolicy: payload.tenantExecutionPolicy ?? payload.policy ?? emptyLiveTenantReadiness.tenantExecutionPolicy, connectorHealth, evidenceExportReadiness: Array.isArray(payload.evidenceExportReadiness) ? payload.evidenceExportReadiness : [payload.evidenceExportReadiness].filter(Boolean).length ? [payload.evidenceExportReadiness] : emptyLiveTenantReadiness.evidenceExportReadiness }
}

function isReadinessEmpty(data: ReturnType<typeof normalizeReadinessPayload>): boolean {
  return data.connectorHealth.length === 0 && data.evidenceExportReadiness.length === 0
}

export function useLiveTenantReadinessData(): LiveTenantReadinessData {
  const workspace = useWorkspace()
  const isDemo = workspace.mode === 'demo'
  const [data, setData] = useState(() => normalizeReadinessPayload())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [dataState, setDataState] = useState<LiveTenantReadinessDataState>('DEMO')
  const load = useCallback(async () => {
    if (workspace.mode === 'demo') {
      setData(normalizeReadinessPayload(liveTenantReadinessDemoSeed())); setError(undefined); setDataState('DEMO'); setLoading(false)
      return
    }
    if (!workspace.dataReady) {
      setData(normalizeReadinessPayload()); setError(undefined); setDataState('NOT_CONNECTED'); setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [readiness, connectorHealth, evidenceExportReadiness, tenantExecutionPolicy] = await Promise.all([liveFetch<any>('/api/runtime/live-tenant-readiness'), liveFetch<any>('/api/runtime/connector-health'), liveFetch<any>('/api/runtime/evidence-export-readiness?wedge=M365'), liveFetch<any>('/api/runtime/tenant-execution-policy')])
      const next = normalizeReadinessPayload({ readiness, connectorHealth, evidenceExportReadiness, tenantExecutionPolicy })
      setData(next)
      setError(undefined)
      setDataState(isReadinessEmpty(next) ? 'NO_DATA' : 'LIVE')
    } catch (err) {
      const normalized = normalizeApiError(err)
      setData(normalizeReadinessPayload()); setError(normalized.message)
      setDataState('NO_DATA')
    } finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady])
  useEffect(() => { void load() }, [load])
  const refreshConnectorHealth = useCallback(async () => {
    const targets = data.connectorHealth
    await Promise.all(targets.map((connector: ConnectorHealthReport) => liveFetch('/api/runtime/connector-health/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ connectorId: connector.connectorId }) }).catch(() => undefined)))
    await load()
  }, [data.connectorHealth, load])
  const updateTenantExecutionPolicy = useCallback(async (input: Partial<TenantExecutionPolicy>) => {
    await liveFetch('/api/runtime/tenant-execution-policy', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
    await load()
  }, [load])
  return { ...data, isDemo, dataState, loading, error, refreshConnectorHealth, updateTenantExecutionPolicy }
}
