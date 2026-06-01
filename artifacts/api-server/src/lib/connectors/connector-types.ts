export type ConnectorPlatform = 'M365' | 'AWS' | 'SNOWFLAKE' | 'SERVICENOW' | 'FLEXERA'
export type ConnectorLifecycleState = 'READY' | 'NOT_CONFIGURED' | 'NOT_IMPLEMENTED' | 'DEGRADED' | 'FAILED'

export interface AuthResult { connectorId: string; tenantId: string; authenticated: boolean; state: ConnectorLifecycleState | 'TOKEN_FAILED'; requestId?: string; error?: string }
export interface ConnectorReadiness { connectorId: string; tenantId: string; state: ConnectorLifecycleState | 'MISSING_CONFIG' | 'TOKEN_FAILED' | 'GRAPH_UNREACHABLE' | 'INSUFFICIENT_PERMISSIONS'; readReady: boolean; writeReady: boolean; blockers: string[]; warnings: string[]; checkedAt: string }
export interface ConnectorHealth { connectorId: string; tenantId: string; state: ConnectorLifecycleState | 'HEALTHY' | 'PARTIAL'; dimensions?: Record<string, string>; warnings: string[]; blockers: string[]; checkedAt: string }
export interface DiscoveryResult { connectorId: string; tenantId: string; status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'NOT_IMPLEMENTED'; counts: Record<string, number>; warnings: string[]; blockers: string[]; startedAt: string; completedAt: string }
export interface ConnectorTrust { connectorId: string; tenantId: string; globalTrustScore: number; globalTrustBand: string; generatedAt: string }

export interface Connector {
  connectorId: string
  platform: ConnectorPlatform
  authenticate(): Promise<AuthResult>
  readiness(): Promise<ConnectorReadiness>
  health(): Promise<ConnectorHealth>
  discover(): Promise<DiscoveryResult>
  trust(): Promise<ConnectorTrust>
  capabilities: { read: boolean; dryRun: boolean; execute: boolean; verify: boolean }
}
