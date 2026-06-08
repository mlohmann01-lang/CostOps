import { aiIntelligenceService, type AIAsset, type AIAssetType, type AISpendRecord, type AIUsageRecord } from './ai-intelligence'

export type AIDiscoveryConnectorId = 'OPENAI' | 'ANTHROPIC' | 'GITHUB_COPILOT' | 'MICROSOFT_COPILOT' | 'CURSOR' | 'CLAUDE_TEAMS' | 'GEMINI_ENTERPRISE' | 'AZURE_OPENAI' | 'LANGGRAPH' | 'CREWAI' | 'OPENAI_AGENTS' | 'CUSTOM_MCP_REGISTRY'
export type AIDiscoveryCapability = 'DISCOVER_MODELS' | 'DISCOVER_PROJECTS' | 'DISCOVER_USERS' | 'DISCOVER_API_KEYS' | 'DISCOVER_LICENSES' | 'DISCOVER_ASSIGNMENTS' | 'DISCOVER_MCP_SERVERS' | 'DISCOVER_WORKFLOWS' | 'READ_USAGE' | 'READ_SPEND'
export type AIDiscoveryConnectorConfig = { connectorId: AIDiscoveryConnectorId; apiKey?: string; accessToken?: string; tenantId?: string; organizationId?: string; baseUrl?: string; githubOrg?: string; azureTenantId?: string; registryUrl?: string; headers?: Record<string, string>; fetchImpl?: typeof fetch }
export type AIDiscoveredTelemetry = { assets: AIAsset[]; usageRecords: AIUsageRecord[]; spendRecords: AISpendRecord[]; warnings: string[]; rawSources: Array<{ source: string; status: number; records: number }> }
export type AIDiscoveryRunResult = AIDiscoveredTelemetry & { tenantId: string; connectorId: AIDiscoveryConnectorId; status: 'COMPLETED' | 'PARTIAL' | 'FAILED'; syncedAt: string; summary: { discoveredAssets: number; usageRecords: number; spendRecords: number; unmanagedAI: number; shadowAI: number; dormantAI: number } }

const CONNECTOR_CATALOG: Record<AIDiscoveryConnectorId, { tier: 1 | 2 | 3; vendor: string; capabilities: AIDiscoveryCapability[]; requiredConfig: string[] }> = {
  OPENAI: { tier: 1, vendor: 'OpenAI', capabilities: ['DISCOVER_MODELS', 'DISCOVER_PROJECTS', 'DISCOVER_USERS', 'READ_USAGE', 'READ_SPEND'], requiredConfig: ['apiKey'] },
  ANTHROPIC: { tier: 1, vendor: 'Anthropic', capabilities: ['DISCOVER_MODELS', 'DISCOVER_PROJECTS', 'DISCOVER_API_KEYS', 'READ_USAGE', 'READ_SPEND'], requiredConfig: ['apiKey'] },
  GITHUB_COPILOT: { tier: 1, vendor: 'GitHub Copilot', capabilities: ['DISCOVER_LICENSES', 'DISCOVER_USERS', 'READ_USAGE'], requiredConfig: ['accessToken', 'githubOrg'] },
  MICROSOFT_COPILOT: { tier: 1, vendor: 'Microsoft Copilot', capabilities: ['DISCOVER_LICENSES', 'DISCOVER_ASSIGNMENTS', 'READ_USAGE'], requiredConfig: ['accessToken'] },
  CURSOR: { tier: 2, vendor: 'Cursor', capabilities: ['DISCOVER_USERS', 'READ_USAGE', 'READ_SPEND'], requiredConfig: ['apiKey'] },
  CLAUDE_TEAMS: { tier: 2, vendor: 'Claude Teams', capabilities: ['DISCOVER_USERS', 'READ_USAGE', 'READ_SPEND'], requiredConfig: ['apiKey'] },
  GEMINI_ENTERPRISE: { tier: 2, vendor: 'Gemini Enterprise', capabilities: ['DISCOVER_MODELS', 'DISCOVER_USERS', 'READ_USAGE', 'READ_SPEND'], requiredConfig: ['accessToken'] },
  AZURE_OPENAI: { tier: 2, vendor: 'Azure OpenAI', capabilities: ['DISCOVER_MODELS', 'DISCOVER_PROJECTS', 'READ_USAGE', 'READ_SPEND'], requiredConfig: ['accessToken', 'baseUrl'] },
  LANGGRAPH: { tier: 3, vendor: 'LangGraph', capabilities: ['DISCOVER_WORKFLOWS', 'READ_USAGE'], requiredConfig: ['apiKey', 'baseUrl'] },
  CREWAI: { tier: 3, vendor: 'CrewAI', capabilities: ['DISCOVER_WORKFLOWS', 'READ_USAGE'], requiredConfig: ['apiKey', 'baseUrl'] },
  OPENAI_AGENTS: { tier: 3, vendor: 'OpenAI Agents', capabilities: ['DISCOVER_WORKFLOWS', 'READ_USAGE'], requiredConfig: ['apiKey'] },
  CUSTOM_MCP_REGISTRY: { tier: 3, vendor: 'Custom MCP Registry', capabilities: ['DISCOVER_MCP_SERVERS'], requiredConfig: ['registryUrl'] },
}

function now() { return new Date().toISOString() }
function stableId(connectorId: AIDiscoveryConnectorId, kind: string, id: string) { return `${connectorId.toLowerCase()}-${kind.toLowerCase()}-${String(id).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80)}` }
function arr(payload: any): any[] { return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.value) ? payload.value : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.seats) ? payload.seats : Array.isArray(payload) ? payload : [] }
function headers(config: AIDiscoveryConnectorConfig) { return { accept: 'application/json', authorization: `Bearer ${config.apiKey ?? config.accessToken ?? ''}`, ...(config.headers ?? {}) } }
async function getJson(config: AIDiscoveryConnectorConfig, path: string, warnings: string[], rawSources: AIDiscoveredTelemetry['rawSources']) {
  const base = config.baseUrl ?? defaultBase(config.connectorId)
  const url = path.startsWith('http') ? path : `${base}${path}`
  const response = await (config.fetchImpl ?? fetch)(url, { headers: headers(config) })
  if (!response.ok) { warnings.push(`${config.connectorId}:${path}:HTTP_${response.status}`); rawSources.push({ source: path, status: response.status, records: 0 }); return [] }
  const json = await response.json().catch(() => ({}))
  const rows = arr(json)
  rawSources.push({ source: path, status: response.status, records: rows.length })
  return rows
}
function defaultBase(id: AIDiscoveryConnectorId) { if (id === 'ANTHROPIC' || id === 'CLAUDE_TEAMS') return 'https://api.anthropic.com'; if (id === 'GITHUB_COPILOT') return 'https://api.github.com'; if (id === 'MICROSOFT_COPILOT') return 'https://graph.microsoft.com/v1.0'; if (id === 'GEMINI_ENTERPRISE') return 'https://generativelanguage.googleapis.com'; return 'https://api.openai.com' }
function asset(tenantId: string, connectorId: AIDiscoveryConnectorId, input: { id: string; name: string; assetType: AIAssetType; vendor?: string; ownerId?: string; department?: string; status?: AIAsset['status']; approvalStatus?: AIAsset['approvalStatus']; metadata?: Record<string, unknown> }) {
  const ts = now()
  return { id: stableId(connectorId, input.assetType, input.id), tenantId, name: input.name, assetType: input.assetType, vendor: input.vendor ?? CONNECTOR_CATALOG[connectorId].vendor, status: input.status ?? 'DISCOVERED', ownerId: input.ownerId, department: input.department, approvalStatus: input.approvalStatus ?? 'UNKNOWN', source: 'AI_CONNECTOR_DISCOVERY', sourceSystem: connectorId, discoveredAt: ts, lastSeenAt: ts, createdAt: ts, updatedAt: ts, metadata: input.metadata ?? {} } satisfies AIAsset
}

export class AIConnectorDiscoveryService {
  catalog() { return Object.entries(CONNECTOR_CATALOG).map(([connectorId, item]) => ({ connectorId, ...item })) }
  capabilities(connectorId: AIDiscoveryConnectorId) { return CONNECTOR_CATALOG[connectorId] }
  validate(config: AIDiscoveryConnectorConfig) { const info = CONNECTOR_CATALOG[config.connectorId]; const missing = info.requiredConfig.filter((key) => !(config as any)[key]); return { connectorId: config.connectorId, status: missing.length ? 'BLOCKED' as const : 'READY' as const, missing, capabilities: info.capabilities, tier: info.tier } }
  async discover(tenantId: string, config: AIDiscoveryConnectorConfig): Promise<AIDiscoveryRunResult> {
    const readiness = this.validate(config)
    if (readiness.status === 'BLOCKED') return this.finish(tenantId, config.connectorId, 'FAILED', { assets: [], usageRecords: [], spendRecords: [], warnings: [`Missing config: ${readiness.missing.join(',')}`], rawSources: [] })
    const telemetry = await this.fetchTelemetry(tenantId, config)
    for (const item of telemetry.assets) aiIntelligenceService.createAsset(tenantId, item)
    for (const item of telemetry.usageRecords) aiIntelligenceService.ingestUsage(tenantId, item)
    for (const item of telemetry.spendRecords) aiIntelligenceService.ingestSpend(tenantId, item)
    return this.finish(tenantId, config.connectorId, telemetry.warnings.length ? 'PARTIAL' : 'COMPLETED', telemetry)
  }
  private finish(tenantId: string, connectorId: AIDiscoveryConnectorId, status: AIDiscoveryRunResult['status'], telemetry: AIDiscoveredTelemetry): AIDiscoveryRunResult { const assets = aiIntelligenceService.listAssets(tenantId); return { tenantId, connectorId, status, syncedAt: now(), ...telemetry, summary: { discoveredAssets: telemetry.assets.length, usageRecords: telemetry.usageRecords.length, spendRecords: telemetry.spendRecords.length, unmanagedAI: assets.filter((a) => !a.ownerId).length, shadowAI: assets.filter((a) => a.approvalStatus !== 'APPROVED').length, dormantAI: aiIntelligenceService.listUsage(tenantId).dormantAssets.length } } }
  private async fetchTelemetry(tenantId: string, config: AIDiscoveryConnectorConfig): Promise<AIDiscoveredTelemetry> {
    const warnings: string[] = []
    const rawSources: AIDiscoveredTelemetry['rawSources'] = []
    if (config.connectorId === 'OPENAI') return this.openai(tenantId, config, warnings, rawSources)
    if (config.connectorId === 'ANTHROPIC') return this.anthropic(tenantId, config, warnings, rawSources)
    if (config.connectorId === 'GITHUB_COPILOT') return this.githubCopilot(tenantId, config, warnings, rawSources)
    if (config.connectorId === 'MICROSOFT_COPILOT') return this.microsoftCopilot(tenantId, config, warnings, rawSources)
    return this.generic(tenantId, config, warnings, rawSources)
  }
  private async openai(tenantId: string, config: AIDiscoveryConnectorConfig, warnings: string[], rawSources: AIDiscoveredTelemetry['rawSources']) {
    const models = await getJson(config, '/v1/models', warnings, rawSources)
    const projects = await getJson(config, '/v1/organization/projects', warnings, rawSources)
    const users = await getJson(config, '/v1/organization/users', warnings, rawSources)
    const usage = await getJson(config, '/v1/organization/usage/completions', warnings, rawSources)
    const costs = await getJson(config, '/v1/organization/costs', warnings, rawSources)
    return this.fromRows(tenantId, config.connectorId, { models, projects, users, usage, costs }, warnings, rawSources)
  }
  private async anthropic(tenantId: string, config: AIDiscoveryConnectorConfig, warnings: string[], rawSources: AIDiscoveredTelemetry['rawSources']) {
    const models = await getJson(config, '/v1/models', warnings, rawSources)
    const projects = await getJson(config, '/v1/organizations/projects', warnings, rawSources)
    const keys = await getJson(config, '/v1/organizations/api_keys', warnings, rawSources)
    const usage = await getJson(config, '/v1/organizations/usage', warnings, rawSources)
    const costs = await getJson(config, '/v1/organizations/costs', warnings, rawSources)
    return this.fromRows(tenantId, config.connectorId, { models, projects, users: keys, usage, costs }, warnings, rawSources)
  }
  private async githubCopilot(tenantId: string, config: AIDiscoveryConnectorConfig, warnings: string[], rawSources: AIDiscoveredTelemetry['rawSources']) {
    const org = encodeURIComponent(config.githubOrg ?? '')
    const seats = await getJson(config, `/orgs/${org}/copilot/billing/seats`, warnings, rawSources)
    const usage = await getJson(config, `/orgs/${org}/copilot/usage`, warnings, rawSources)
    return this.fromRows(tenantId, config.connectorId, { models: [], projects: [], users: seats, usage, costs: seats.map((seat) => ({ ...seat, totalSpend: Number(seat.costPerSeatPerMonth ?? 39) })) }, warnings, rawSources)
  }
  private async microsoftCopilot(tenantId: string, config: AIDiscoveryConnectorConfig, warnings: string[], rawSources: AIDiscoveredTelemetry['rawSources']) {
    const users = await getJson(config, '/users?$select=id,displayName,userPrincipalName,department,assignedLicenses&$top=999', warnings, rawSources)
    const usage = await getJson(config, "/reports/getMicrosoft365CopilotUsageUserDetail(period='D30')", warnings, rawSources)
    return this.fromRows(tenantId, config.connectorId, { models: [], projects: [], users, usage, costs: users.filter((u) => JSON.stringify(u.assignedLicenses ?? []).toLowerCase().includes('copilot')).map((u) => ({ ...u, totalSpend: 30 })) }, warnings, rawSources)
  }
  private async generic(tenantId: string, config: AIDiscoveryConnectorConfig, warnings: string[], rawSources: AIDiscoveredTelemetry['rawSources']) {
    const basePath = config.connectorId === 'CUSTOM_MCP_REGISTRY' ? (config.registryUrl ?? '/mcp') : '/api/assets'
    const rows = await getJson(config, basePath, warnings, rawSources)
    return this.fromRows(tenantId, config.connectorId, { models: [], projects: rows, users: [], usage: [], costs: [] }, warnings, rawSources)
  }
  private fromRows(tenantId: string, connectorId: AIDiscoveryConnectorId, rows: { models: any[]; projects: any[]; users: any[]; usage: any[]; costs: any[] }, warnings: string[] = [], rawSources: AIDiscoveredTelemetry['rawSources'] = []): AIDiscoveredTelemetry {
    const assets: AIAsset[] = []
    for (const model of rows.models) assets.push(asset(tenantId, connectorId, { id: model.id ?? model.name, name: model.id ?? model.display_name ?? model.name, assetType: 'MODEL', metadata: model }))
    for (const project of rows.projects) assets.push(asset(tenantId, connectorId, { id: project.id ?? project.name, name: project.name ?? project.display_name ?? project.id, assetType: project.assetType ?? 'WORKFLOW', ownerId: project.ownerId ?? project.owner?.id, status: project.status === 'archived' ? 'INACTIVE' : 'DISCOVERED', metadata: project }))
    for (const user of rows.users) assets.push(asset(tenantId, connectorId, { id: user.id ?? user.userId ?? user.email ?? user.userPrincipalName, name: user.email ?? user.userPrincipalName ?? user.login ?? user.displayName ?? user.id, assetType: 'TOOL', ownerId: user.ownerId, department: user.department, approvalStatus: user.approvalStatus ?? 'UNKNOWN', metadata: user }))
    const primary = assets[0]
    const resolveAssetId = (row: any, kind: 'MODEL' | 'TOOL') => row.assetId ?? (row.model || row.modelId ? stableId(connectorId, 'MODEL', row.model ?? row.modelId) : row.id || row.userId || row.email || row.userPrincipalName ? stableId(connectorId, kind, row.id ?? row.userId ?? row.email ?? row.userPrincipalName) : primary?.id ?? stableId(connectorId, kind, `${connectorId}-unknown`))
    const usageRecords = rows.usage.map((row, index) => ({ tenantId, id: `${connectorId.toLowerCase()}-usage-${index}-${row.id ?? row.model ?? row.date ?? Date.now()}`, assetId: resolveAssetId(row, 'TOOL'), assetType: row.model ? 'MODEL' as const : 'TOOL' as const, periodStart: row.periodStart ?? row.start_time ?? row.date ?? now(), periodEnd: row.periodEnd ?? row.end_time ?? row.date ?? now(), requestCount: Number(row.requestCount ?? row.num_model_requests ?? row.requests ?? 0), executionCount: Number(row.executionCount ?? row.executions ?? 0), userCount: Number(row.userCount ?? row.users ?? row.activeUsers ?? 0), tokenCount: Number(row.tokenCount ?? row.input_tokens ?? 0) + Number(row.output_tokens ?? 0), inputTokenCount: Number(row.inputTokenCount ?? row.input_tokens ?? 0), outputTokenCount: Number(row.outputTokenCount ?? row.output_tokens ?? 0), successCount: Number(row.successCount ?? row.succeeded ?? 0), failureCount: Number(row.failureCount ?? row.failed ?? row.errorCount ?? 0), lastUsedAt: row.lastUsedAt ?? row.last_active_at ?? row.date, source: connectorId, metadata: row, createdAt: now() }))
    const spendRecords = rows.costs.map((row, index) => ({ tenantId, id: `${connectorId.toLowerCase()}-spend-${index}-${row.id ?? row.date ?? Date.now()}`, assetId: resolveAssetId(row, 'TOOL'), assetType: row.model ? 'MODEL' as const : 'TOOL' as const, vendor: CONNECTOR_CATALOG[connectorId].vendor, periodStart: row.periodStart ?? row.start_time ?? row.date ?? now(), periodEnd: row.periodEnd ?? row.end_time ?? row.date ?? now(), currency: row.currency ?? 'USD', totalSpend: Number(row.totalSpend ?? row.amount?.value ?? row.cost ?? row.cost_usd ?? row.costPerSeatPerMonth ?? 0), tokenSpend: Number(row.tokenSpend ?? 0), inferenceSpend: Number(row.inferenceSpend ?? row.amount?.value ?? row.cost_usd ?? 0), subscriptionSpend: Number(row.subscriptionSpend ?? row.costPerSeatPerMonth ?? 0), seatSpend: Number(row.seatSpend ?? row.costPerSeatPerMonth ?? 0), workflowSpend: Number(row.workflowSpend ?? 0), agentSpend: Number(row.agentSpend ?? 0), department: row.department, costCentre: row.costCentre, source: connectorId, metadata: row, createdAt: now() }))
    return { assets, usageRecords, spendRecords, warnings, rawSources }
  }
}

export const aiConnectorDiscoveryService = new AIConnectorDiscoveryService()
