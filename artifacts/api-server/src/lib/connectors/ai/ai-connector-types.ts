// Extended connector IDs for AI vendors (separate from base SDK to avoid modifying it)
export const AI_CONNECTOR_IDS = [
  'OPENAI',
  'ANTHROPIC',
  'CURSOR',
  'WINDSURF',
  'AZURE_OPENAI',
  'GOOGLE_AI',
  'PERPLEXITY',
] as const
export type AIConnectorId = (typeof AI_CONNECTOR_IDS)[number]

// AI-specific capabilities
export const AI_CONNECTOR_CAPABILITIES = [
  'READ_TOKEN_USAGE',
  'READ_MODEL_USAGE',
  'READ_SEAT_ASSIGNMENTS',
  'READ_BILLING_EXPORT',
  'READ_AGENT_ACTIVITY',
  'READ_WORKSPACE_ACTIVITY',
  'MANAGE_SEATS',
  'MANAGE_LIMITS',
] as const
export type AIConnectorCapability = (typeof AI_CONNECTOR_CAPABILITIES)[number]

// AI usage record (normalized across all vendors)
export type NormalizedAIUsageRecord = {
  tenantId: string
  connectorId: AIConnectorId
  recordDate: string               // ISO date
  modelId: string
  vendor: string
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  totalCostUSD: number
  activeSeats: number
  totalSeats: number
  idleSeats: number                // seats with no activity in 30 days
  agentActivityCount: number       // automated/agent requests
  humanActivityCount: number       // interactive/user requests
  averageContextTokens: number
  averageOutputTokens: number
  retryCount: number
  errorCount: number
  environment: string              // 'production' | 'development' | 'unknown'
}

// Seat assignment record
export type AIVendorSeatRecord = {
  userId: string
  email: string
  assignedAt: string
  lastActiveAt: string | null
  lastActiveDaysAgo: number | null
  isIdle: boolean                  // no activity in 30+ days
  plan: string                     // 'enterprise' | 'pro' | 'free'
  costPerSeatPerMonth: number
}

// Connector sync result
export type AIConnectorSyncResult = {
  connectorId: AIConnectorId
  tenantId: string
  syncedAt: string
  usageRecords: NormalizedAIUsageRecord[]
  seatRecords: AIVendorSeatRecord[]
  health: 'HEALTHY' | 'DEGRADED' | 'FAILED'
  errorMessage?: string
}

// Base AI connector interface
export interface BaseAIConnector {
  id: AIConnectorId
  capabilities: readonly AIConnectorCapability[]
  runSync(tenantId: string): Promise<AIConnectorSyncResult>
  checkHealth(tenantId: string): Promise<'HEALTHY' | 'DEGRADED' | 'FAILED'>
}

// Connector mode
export type ConnectorMode = 'LIVE' | 'MOCK_CONNECTOR'
