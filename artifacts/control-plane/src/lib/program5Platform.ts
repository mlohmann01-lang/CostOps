export const program5PlatformQuestion = 'Is the platform configured, connected, healthy, tenant-safe, and ready to operate trusted governance workflows?'

export const platformDecisions = ['READY', 'CONFIGURE', 'CONNECT', 'VERIFY', 'DEGRADED', 'BLOCKED'] as const
export type PlatformDecision = (typeof platformDecisions)[number]
export type PlatformEvidenceStatus = 'COMPLETE' | 'PARTIAL'

export type PlatformEvidence = {
  tenantIdentifier?: string
  runtimeMode?: string
  connectorInventory?: string[]
  connectorHealth?: Record<string, 'HEALTHY' | 'DEGRADED' | 'BLOCKED' | 'NOT_CONNECTED' | 'UNVERIFIED'>
  evidenceSourceStatus?: string
  readinessStatus?: 'READY' | 'NOT_READY' | 'DEGRADED' | 'BLOCKED' | 'UNKNOWN'
  adminSettingsState?: string
  userRolePermissionState?: string
  healthCheckResult?: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN'
  timestamp?: string
  lineage?: string
  confidence?: number
  trustProofReference?: string
  missingRequiredSettings?: boolean
  missingConnectors?: boolean
  unverifiedConnector?: boolean
  healthIssueDetected?: boolean
  criticalMissingOperationalEvidence?: boolean
}

export const platformCapabilities = [
  { key: 'admin', label: 'Admin', route: '/platform/admin' },
  { key: 'runtime', label: 'Runtime', route: '/platform/runtime' },
  { key: 'connectors', label: 'Connectors', route: '/platform/connectors' },
  { key: 'health', label: 'Health', route: '/platform/health' },
  { key: 'tenants', label: 'Tenants', route: '/platform/tenants' },
  { key: 'settings', label: 'Settings', route: '/platform/settings' },
  { key: 'readiness', label: 'Readiness', route: '/platform/readiness' },
  { key: 'evidence', label: 'Platform Evidence Pack / Proof Pack', route: '/platform/evidence' },
] as const

export const emptyPlatformEvidence: PlatformEvidence = {}

export const demoPlatformEvidence: PlatformEvidence = {
  tenantIdentifier: 'demo-sandbox-tenant',
  runtimeMode: 'DEMO / PILOT_CONTROLLED_EXECUTION',
  connectorInventory: ['Microsoft 365', 'AWS', 'Azure', 'ServiceNow', 'Snowflake'],
  connectorHealth: { 'Microsoft 365': 'HEALTHY', AWS: 'HEALTHY', Azure: 'DEGRADED', ServiceNow: 'HEALTHY', Snowflake: 'UNVERIFIED' },
  evidenceSourceStatus: 'Evidence sources connected for demo tenant: identity, usage, finance, execution, outcome and trust.',
  readinessStatus: 'DEGRADED',
  adminSettingsState: 'Admin controls configured; live writes disabled in demo.',
  userRolePermissionState: 'Admin, Operator, Approver, Auditor and Viewer roles present.',
  healthCheckResult: 'WARN',
  timestamp: '2026-07-07T00:00:00Z',
  lineage: 'platform/demo/runtime/connectors/settings/health',
  confidence: 82,
  trustProofReference: 'proof:platform:demo-readiness',
  healthIssueDetected: true,
  unverifiedConnector: true,
}

export function getPlatformEvidencePackCompleteness(input: PlatformEvidence): { status: PlatformEvidenceStatus; missing: string[] } {
  const required: Array<[keyof PlatformEvidence, string]> = [
    ['tenantIdentifier', 'Tenant identifier'], ['runtimeMode', 'Runtime mode'], ['connectorInventory', 'Connector inventory'], ['connectorHealth', 'Connector health'], ['evidenceSourceStatus', 'Evidence source status'], ['readinessStatus', 'Readiness status'], ['adminSettingsState', 'Admin/settings state'], ['userRolePermissionState', 'User/role/permission state'], ['healthCheckResult', 'Health check result'], ['timestamp', 'Timestamp'], ['lineage', 'Lineage'], ['confidence', 'Confidence'], ['trustProofReference', 'Trust/proof reference'],
  ]
  const missing = required.filter(([key]) => {
    const value = input[key]
    return value === undefined || value === '' || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0)
  }).map(([, label]) => label)
  return { status: missing.length ? 'PARTIAL' : 'COMPLETE', missing }
}

export function inferPlatformDecision(input: PlatformEvidence): { decision: PlatformDecision; reason: string } {
  if (input.criticalMissingOperationalEvidence) return { decision: 'BLOCKED', reason: 'Critical operational evidence is missing.' }
  if (input.missingRequiredSettings) return { decision: 'CONFIGURE', reason: 'Required platform settings must be configured.' }
  if (input.missingConnectors || !input.connectorInventory?.length) return { decision: 'CONNECT', reason: 'Required connectors or evidence sources are not connected.' }
  if (input.unverifiedConnector || Object.values(input.connectorHealth ?? {}).some((status) => status === 'UNVERIFIED')) return { decision: 'VERIFY', reason: 'Connector exists but has not been verified.' }
  if (input.healthIssueDetected || input.healthCheckResult === 'WARN' || input.readinessStatus === 'DEGRADED' || Object.values(input.connectorHealth ?? {}).some((status) => status === 'DEGRADED')) return { decision: 'DEGRADED', reason: 'Platform health issue or degraded connector detected.' }
  if (getPlatformEvidencePackCompleteness(input).status === 'COMPLETE' && input.healthCheckResult === 'PASS' && input.readinessStatus === 'READY') return { decision: 'READY', reason: 'Required platform evidence is complete and healthy.' }
  return { decision: 'BLOCKED', reason: 'Platform readiness cannot be trusted without complete evidence.' }
}

export function summarizePlatformKpis(input: PlatformEvidence) {
  const connectorStatuses = Object.values(input.connectorHealth ?? {})
  const complete = getPlatformEvidencePackCompleteness(input).status === 'COMPLETE'
  return {
    tenantReadiness: input.readinessStatus ?? 'UNKNOWN',
    runtimeMode: input.runtimeMode ?? 'UNKNOWN',
    connectedSources: input.connectorInventory?.length ?? 0,
    healthyConnectors: connectorStatuses.filter((status) => status === 'HEALTHY').length,
    degradedConnectors: connectorStatuses.filter((status) => status === 'DEGRADED').length,
    blockedCapabilities: connectorStatuses.filter((status) => status === 'BLOCKED' || status === 'NOT_CONNECTED').length,
    liveReadyCapabilities: input.readinessStatus === 'READY' ? connectorStatuses.filter((status) => status === 'HEALTHY').length : 0,
    evidenceSourceCoverage: input.evidenceSourceStatus ? 'AVAILABLE' : 'UNKNOWN',
    healthCheckStatus: input.healthCheckResult ?? 'UNKNOWN',
    platformEvidenceCompleteness: complete ? 100 : input.tenantIdentifier ? 50 : undefined,
  }
}

export function program5LiveUnconnectedCopy(capability = 'Platform Operations') {
  return `${capability} requires connected runtime, connector, tenant, settings, health and evidence sources. No demo live connector health, tenant readiness, live settings, live users, live roles, evidence sources, health status, live readiness or operational confidence are shown in live-unconnected mode.`
}
