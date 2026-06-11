import { useCallback, useEffect, useState } from 'react'
import { liveFetch, normalizeApiError } from '../lib/liveApi'

export type TenantRuntimeMode = 'DEMO' | 'PILOT_READ_ONLY' | 'PILOT_CONTROLLED_EXECUTION' | 'PRODUCTION_CONTROLLED_EXECUTION'
export type ConnectorHealthReport = { tenantId: string; connectorId: string; connectorType: 'M365' | 'AI' | 'SERVICENOW'; status: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED' | 'EXPIRED_CREDENTIALS' | 'MISSING_SCOPES' | 'RATE_LIMITED'; lastCheckedAt: string; credentialExpiresAt?: string; scopes?: string[]; missingScopes?: string[]; rateLimitResetAt?: string; errors: string[] }
export type TenantExecutionPolicy = { tenantId: string; mode: TenantRuntimeMode; allowRealWrites: boolean; allowDryRun: boolean; requireApprovalAuthority: boolean; requireTrustAuthority: boolean; requireEvidence: boolean; requireRollbackForDestructive: boolean; maxBlastRadiusAllowed: 'LOW' | 'MEDIUM' | 'HIGH'; allowedDomains: Array<'M365' | 'AI' | 'SERVICENOW'>; createdAt: string; updatedAt: string }
export type EvidenceExportReadiness = { tenantId: string; actionId?: string; wedge: 'M365' | 'AI' | 'SERVICENOW'; ready: boolean; missing: string | null; missingItems: string[]; generatedAt: string }
export type LiveTenantReadinessData = { readiness: { tenantId: string; mode: TenantRuntimeMode; certifiedWedges: { m365: boolean; ai: boolean; servicenow: boolean }; connectorHealth: ConnectorHealthReport[]; executionGateSummary: { allowed: number; blocked: number; dryRunOnly: number }; auditCompleteness: { complete: number; incomplete: number }; evidenceExportReadiness: { ready: number; blocked: number }; blockers: string[]; readyForPilot: boolean; readyForProduction: boolean }; tenantExecutionPolicy: TenantExecutionPolicy; connectorHealth: ConnectorHealthReport[]; evidenceExportReadiness: EvidenceExportReadiness[]; isDemo: boolean; loading: boolean; error?: string; refreshConnectorHealth(): Promise<void>; updateTenantExecutionPolicy(input: Partial<TenantExecutionPolicy>): Promise<void> }

export const liveTenantReadinessApiPaths = ['/api/runtime/live-tenant-readiness', '/api/runtime/connector-health', '/api/runtime/evidence-export-readiness', '/api/runtime/tenant-execution-policy'] as const
const now = '2026-06-11T00:00:00Z'
export const demoLiveTenantReadiness = {
  readiness: { tenantId: 'demo-tenant', mode: 'PILOT_CONTROLLED_EXECUTION' as TenantRuntimeMode, certifiedWedges: { m365: true, ai: true, servicenow: true }, connectorHealth: [] as ConnectorHealthReport[], executionGateSummary: { allowed: 7, blocked: 2, dryRunOnly: 1 }, auditCompleteness: { complete: 5, incomplete: 1 }, evidenceExportReadiness: { ready: 2, blocked: 1 }, blockers: ['Production mode blocked until ServiceNow connector health is healthy', 'Audit incomplete for Copilot reclaim action', 'Evidence export blocked: missing verification evidence'], readyForPilot: true, readyForProduction: false },
  tenantExecutionPolicy: { tenantId: 'demo-tenant', mode: 'PILOT_CONTROLLED_EXECUTION' as TenantRuntimeMode, allowRealWrites: true, allowDryRun: true, requireApprovalAuthority: true, requireTrustAuthority: true, requireEvidence: true, requireRollbackForDestructive: true, maxBlastRadiusAllowed: 'MEDIUM' as const, allowedDomains: ['M365', 'AI', 'SERVICENOW'] as Array<'M365' | 'AI' | 'SERVICENOW'>, createdAt: now, updatedAt: now },
  connectorHealth: [
    { tenantId: 'demo-tenant', connectorId: 'm365-prod', connectorType: 'M365' as const, status: 'HEALTHY' as const, credentialExpiresAt: '2026-07-01T00:00:00Z', scopes: ['User.Read.All', 'Directory.Read.All'], missingScopes: [], lastCheckedAt: now, errors: [] },
    { tenantId: 'demo-tenant', connectorId: 'servicenow-prod', connectorType: 'SERVICENOW' as const, status: 'DEGRADED' as const, credentialExpiresAt: '2026-06-20T00:00:00Z', scopes: ['change.write'], missingScopes: ['approval.write'], rateLimitResetAt: '2026-06-11T01:00:00Z', lastCheckedAt: now, errors: ['ServiceNow approval scope missing'] },
  ],
  evidenceExportReadiness: [
    { tenantId: 'demo-tenant', actionId: 'copilot-reclaim-001', wedge: 'M365' as const, ready: false, missing: 'VERIFICATION_EVIDENCE', missingItems: ['VERIFICATION_EVIDENCE'], generatedAt: now },
    { tenantId: 'demo-tenant', actionId: 'ai-owner-002', wedge: 'AI' as const, ready: true, missing: null, missingItems: [], generatedAt: now },
    { tenantId: 'demo-tenant', actionId: 'snow-change-003', wedge: 'SERVICENOW' as const, ready: true, missing: null, missingItems: [], generatedAt: now },
  ],
}
demoLiveTenantReadiness.readiness.connectorHealth = demoLiveTenantReadiness.connectorHealth

function normalizeReadinessPayload(payload: any = {}) {
  const readiness = payload.readiness ?? payload.liveTenantReadiness ?? demoLiveTenantReadiness.readiness
  const connectorHealth = Array.isArray(payload.connectorHealth) ? payload.connectorHealth : Array.isArray(readiness.connectorHealth) ? readiness.connectorHealth : demoLiveTenantReadiness.connectorHealth
  return { readiness: { ...demoLiveTenantReadiness.readiness, ...readiness, connectorHealth }, tenantExecutionPolicy: payload.tenantExecutionPolicy ?? payload.policy ?? demoLiveTenantReadiness.tenantExecutionPolicy, connectorHealth, evidenceExportReadiness: Array.isArray(payload.evidenceExportReadiness) ? payload.evidenceExportReadiness : [payload.evidenceExportReadiness].filter(Boolean).length ? [payload.evidenceExportReadiness] : demoLiveTenantReadiness.evidenceExportReadiness }
}

export function useLiveTenantReadinessData(): LiveTenantReadinessData {
  const [data, setData] = useState(() => normalizeReadinessPayload())
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [readiness, connectorHealth, evidenceExportReadiness, tenantExecutionPolicy] = await Promise.all([liveFetch<any>('/api/runtime/live-tenant-readiness'), liveFetch<any>('/api/runtime/connector-health'), liveFetch<any>('/api/runtime/evidence-export-readiness?wedge=M365'), liveFetch<any>('/api/runtime/tenant-execution-policy')])
      setData(normalizeReadinessPayload({ readiness, connectorHealth, evidenceExportReadiness, tenantExecutionPolicy }))
      setIsDemo(false); setError(undefined)
    } catch (err) {
      const normalized = normalizeApiError(err)
      setData(normalizeReadinessPayload(demoLiveTenantReadiness)); setIsDemo(true); setError(normalized.message)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const refreshConnectorHealth = useCallback(async () => {
    const targets = data.connectorHealth.length ? data.connectorHealth : demoLiveTenantReadiness.connectorHealth
    await Promise.all(targets.map((connector: ConnectorHealthReport) => liveFetch('/api/runtime/connector-health/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ connectorId: connector.connectorId }) }).catch(() => undefined)))
    await load()
  }, [data.connectorHealth, load])
  const updateTenantExecutionPolicy = useCallback(async (input: Partial<TenantExecutionPolicy>) => {
    await liveFetch('/api/runtime/tenant-execution-policy', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
    await load()
  }, [load])
  return { ...data, isDemo, loading, error, refreshConnectorHealth, updateTenantExecutionPolicy }
}
