export type ConnectorProvider = 'M365' | 'AWS' | 'SNOWFLAKE' | 'SERVICENOW' | 'FLEXERA' | 'DATABRICKS' | 'ADOBE' | 'SALESFORCE' | 'MOCK'

export type ConnectorMode = 'READ_ONLY' | 'RECOMMEND_ONLY' | 'APPROVAL_REQUIRED' | 'AUTO_EXECUTE_SAFE' | 'GOVERNANCE_ENFORCED'

export type ConnectorLifecycleStage = 'CONNECT' | 'READINESS' | 'DISCOVERY' | 'TRUST' | 'OPPORTUNITY' | 'EXECUTION' | 'VERIFICATION' | 'EVIDENCE'

export type ConnectorHealthStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'READY' | 'DEGRADED' | 'FAILED' | 'BLOCKED'

export type ConnectorCapability = 'AUTH' | 'READINESS_CHECK' | 'DISCOVERY' | 'TRUST_SCORING' | 'OPPORTUNITY_GENERATION' | 'DRY_RUN' | 'EXECUTION' | 'VERIFICATION' | 'EVIDENCE_CAPTURE'

export const CONNECTOR_PROVIDERS: ConnectorProvider[] = ['M365', 'AWS', 'SNOWFLAKE', 'SERVICENOW', 'FLEXERA', 'DATABRICKS', 'ADOBE', 'SALESFORCE', 'MOCK']

export interface ConnectorContext {
  tenantId: string
  actorId?: string
  mode: ConnectorMode
  correlationId?: string
}

export interface ConnectorReadinessResult {
  provider: ConnectorProvider
  tenantId: string
  status: ConnectorHealthStatus
  blockers: string[]
  warnings: string[]
  capabilities: ConnectorCapability[]
  checkedAt: string
}

export interface ConnectorDiscoveryResult<T = unknown> {
  provider: ConnectorProvider
  tenantId: string
  entitiesDiscovered: number
  rawEntities: T[]
  normalizedEntities: unknown[]
  evidenceRefs: string[]
  discoveredAt: string
}

export interface ConnectorTrustResult {
  provider: ConnectorProvider
  tenantId: string
  trustScore: number
  trustBand: 'HIGH' | 'MEDIUM' | 'LOW' | 'BLOCKED'
  reasons: string[]
  evaluatedAt: string
}

export interface ConnectorDryRunResult {
  provider: ConnectorProvider
  tenantId: string
  actionId: string
  safeToExecute: boolean
  blockers: string[]
  warnings: string[]
  estimatedImpact?: unknown
}

export interface ConnectorExecutionResult {
  provider: ConnectorProvider
  tenantId: string
  actionId: string
  status: 'EXECUTED' | 'SKIPPED' | 'FAILED' | 'BLOCKED'
  beforeState?: unknown
  afterState?: unknown
  evidenceRefs: string[]
  executedAt: string
}

export interface ConnectorVerificationResult {
  provider: ConnectorProvider
  tenantId: string
  actionId: string
  verified: boolean
  verificationEvidence: unknown[]
  verifiedAt: string
}

export interface ConnectorEvidenceResult {
  provider: ConnectorProvider
  tenantId: string
  evidencePackId: string
  evidenceItems: unknown[]
  createdAt: string
}
