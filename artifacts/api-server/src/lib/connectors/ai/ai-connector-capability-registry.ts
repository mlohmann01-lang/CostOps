import type { AIConnectorId, AIConnectorCapability } from './ai-connector-types.js'

type ConnectorCapabilityProfile = {
  connectorId: AIConnectorId
  displayName: string
  capabilities: ReadonlyArray<AIConnectorCapability>
  supportsRealTimeSync: boolean
  syncIntervalHours: number         // recommended polling interval
  billingExportLagHours: number     // typical lag from usage to billing export
  seatDataAvailable: boolean
  tokenDataAvailable: boolean
  agentActivityAvailable: boolean
  workspaceActivityAvailable: boolean
  mockMode: boolean                 // true = only mock data available currently
  documentationUrl: string | null
  rateLimitRequestsPerMinute: number | null
}

// Registry of all provider capability profiles
const AI_CONNECTOR_CAPABILITY_REGISTRY: Record<AIConnectorId, ConnectorCapabilityProfile> = {
  OPENAI: {
    connectorId: 'OPENAI',
    displayName: 'OpenAI',
    capabilities: ['READ_TOKEN_USAGE', 'READ_MODEL_USAGE', 'READ_BILLING_EXPORT', 'READ_SEAT_ASSIGNMENTS', 'MANAGE_LIMITS'],
    supportsRealTimeSync: false,
    syncIntervalHours: 24,
    billingExportLagHours: 48,
    seatDataAvailable: true,
    tokenDataAvailable: true,
    agentActivityAvailable: false,
    workspaceActivityAvailable: false,
    mockMode: true,
    documentationUrl: null,
    rateLimitRequestsPerMinute: 60,
  },
  ANTHROPIC: {
    connectorId: 'ANTHROPIC',
    displayName: 'Anthropic',
    capabilities: ['READ_TOKEN_USAGE', 'READ_MODEL_USAGE', 'READ_BILLING_EXPORT', 'READ_SEAT_ASSIGNMENTS'],
    supportsRealTimeSync: false,
    syncIntervalHours: 24,
    billingExportLagHours: 24,
    seatDataAvailable: true,
    tokenDataAvailable: true,
    agentActivityAvailable: false,
    workspaceActivityAvailable: false,
    mockMode: true,
    documentationUrl: null,
    rateLimitRequestsPerMinute: 60,
  },
  CURSOR: {
    connectorId: 'CURSOR',
    displayName: 'Cursor',
    capabilities: ['READ_SEAT_ASSIGNMENTS', 'READ_WORKSPACE_ACTIVITY', 'MANAGE_SEATS'],
    supportsRealTimeSync: false,
    syncIntervalHours: 12,
    billingExportLagHours: 0,
    seatDataAvailable: true,
    tokenDataAvailable: false,
    agentActivityAvailable: false,
    workspaceActivityAvailable: true,
    mockMode: true,
    documentationUrl: null,
    rateLimitRequestsPerMinute: 30,
  },
  WINDSURF: {
    connectorId: 'WINDSURF',
    displayName: 'Windsurf',
    capabilities: ['READ_SEAT_ASSIGNMENTS', 'READ_WORKSPACE_ACTIVITY', 'MANAGE_SEATS'],
    supportsRealTimeSync: false,
    syncIntervalHours: 12,
    billingExportLagHours: 0,
    seatDataAvailable: true,
    tokenDataAvailable: false,
    agentActivityAvailable: false,
    workspaceActivityAvailable: true,
    mockMode: true,
    documentationUrl: null,
    rateLimitRequestsPerMinute: 30,
  },
  AZURE_OPENAI: {
    connectorId: 'AZURE_OPENAI',
    displayName: 'Azure OpenAI',
    capabilities: ['READ_TOKEN_USAGE', 'READ_MODEL_USAGE', 'READ_BILLING_EXPORT', 'MANAGE_LIMITS'],
    supportsRealTimeSync: false,
    syncIntervalHours: 24,
    billingExportLagHours: 72,
    seatDataAvailable: false,
    tokenDataAvailable: true,
    agentActivityAvailable: false,
    workspaceActivityAvailable: false,
    mockMode: true,
    documentationUrl: null,
    rateLimitRequestsPerMinute: 120,
  },
  GOOGLE_AI: {
    connectorId: 'GOOGLE_AI',
    displayName: 'Google AI',
    capabilities: ['READ_TOKEN_USAGE', 'READ_MODEL_USAGE', 'READ_BILLING_EXPORT'],
    supportsRealTimeSync: false,
    syncIntervalHours: 24,
    billingExportLagHours: 48,
    seatDataAvailable: false,
    tokenDataAvailable: true,
    agentActivityAvailable: false,
    workspaceActivityAvailable: false,
    mockMode: true,
    documentationUrl: null,
    rateLimitRequestsPerMinute: 60,
  },
  PERPLEXITY: {
    connectorId: 'PERPLEXITY',
    displayName: 'Perplexity',
    capabilities: ['READ_TOKEN_USAGE', 'READ_BILLING_EXPORT'],
    supportsRealTimeSync: false,
    syncIntervalHours: 48,
    billingExportLagHours: 48,
    seatDataAvailable: false,
    tokenDataAvailable: true,
    agentActivityAvailable: false,
    workspaceActivityAvailable: false,
    mockMode: true,
    documentationUrl: null,
    rateLimitRequestsPerMinute: null,
  },
}

function getConnectorProfile(connectorId: AIConnectorId): ConnectorCapabilityProfile {
  return AI_CONNECTOR_CAPABILITY_REGISTRY[connectorId]
}

function hasCapability(connectorId: AIConnectorId, capability: AIConnectorCapability): boolean {
  return (AI_CONNECTOR_CAPABILITY_REGISTRY[connectorId].capabilities as ReadonlyArray<AIConnectorCapability>).includes(capability)
}

function listConnectorsWithCapability(capability: AIConnectorCapability): ConnectorCapabilityProfile[] {
  return Object.values(AI_CONNECTOR_CAPABILITY_REGISTRY).filter(
    (profile) => (profile.capabilities as ReadonlyArray<AIConnectorCapability>).includes(capability)
  )
}

function listReadyConnectors(): ConnectorCapabilityProfile[] {
  return Object.values(AI_CONNECTOR_CAPABILITY_REGISTRY).filter(
    (profile) => !profile.mockMode
  )
}

function listMockConnectors(): ConnectorCapabilityProfile[] {
  return Object.values(AI_CONNECTOR_CAPABILITY_REGISTRY).filter(
    (profile) => profile.mockMode
  )
}

export type { ConnectorCapabilityProfile }
export {
  AI_CONNECTOR_CAPABILITY_REGISTRY,
  getConnectorProfile,
  hasCapability,
  listConnectorsWithCapability,
  listReadyConnectors,
  listMockConnectors,
}
