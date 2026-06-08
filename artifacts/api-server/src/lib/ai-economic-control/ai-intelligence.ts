import { createHash, randomUUID } from 'node:crypto'
import { platformEventService } from '../events/platform-event-service'

export type AIAssetType = 'MODEL' | 'AGENT' | 'MCP_SERVER' | 'WORKFLOW' | 'TOOL' | 'VENDOR'
export type AIAssetStatus = 'DISCOVERED' | 'ACTIVE' | 'INACTIVE' | 'UNKNOWN' | 'RETIRED' | 'BLOCKED'
export type AIApprovalStatus = 'APPROVED' | 'UNAPPROVED' | 'PENDING_REVIEW' | 'UNKNOWN'
export type AIGovernanceFindingType = 'UNOWNED_AI_ASSET' | 'UNAPPROVED_AI_ASSET' | 'UNKNOWN_AI_OWNER' | 'INACTIVE_AI_ASSET' | 'DUPLICATE_AI_CAPABILITY' | 'STALE_AI_ASSET' | 'MISSING_COST_CENTRE' | 'UNUSED_AI_MODEL' | 'UNUSED_AI_AGENT' | 'UNUSED_MCP_SERVER' | 'UNUSED_AI_WORKFLOW' | 'LOW_USAGE_HIGH_COST_AI_ASSET' | 'FAILED_AI_WORKFLOW' | 'HIGH_AI_SPEND' | 'AI_SPEND_WITHOUT_OWNER' | 'AI_SPEND_WITHOUT_USAGE' | 'HIGH_COST_LOW_USAGE_AI_ASSET' | 'DUPLICATE_AI_SPEND' | 'UNKNOWN_AI_COST_CENTRE'
export type AIRecommendationType = 'ASSIGN_AI_OWNER' | 'REVIEW_AI_ASSET' | 'APPROVE_OR_BLOCK_AI_ASSET' | 'RETIRE_INACTIVE_AI_ASSET' | 'CONSOLIDATE_DUPLICATE_AI_CAPABILITY' | 'RETIRE_UNUSED_AI_AGENT' | 'REVIEW_UNUSED_MCP_SERVER' | 'CONSOLIDATE_LOW_USAGE_WORKFLOW' | 'REVIEW_FAILED_AI_WORKFLOW' | 'REVIEW_LOW_USAGE_HIGH_COST_AI_ASSET' | 'REVIEW_HIGH_AI_SPEND' | 'ASSIGN_AI_SPEND_OWNER' | 'REDUCE_IDLE_AI_SPEND' | 'CONSOLIDATE_DUPLICATE_AI_SPEND' | 'OPTIMISE_HIGH_COST_LOW_USAGE_AI_ASSET'
export type AIEvidenceType = 'AI_ASSET_DISCOVERED' | 'AI_ASSET_OWNER_ASSIGNED' | 'AI_ASSET_REVIEWED' | 'AI_ASSET_APPROVED' | 'AI_ASSET_BLOCKED' | 'AI_ASSET_RETIRED' | 'AI_SPEND_RECORD_INGESTED' | 'AI_SPEND_FINDING_CREATED' | 'AI_SPEND_RECOMMENDATION_CREATED'
export type AIOutcomeLedgerEventType = 'AI_ASSET_DISCOVERED' | 'AI_ASSET_GOVERNANCE_FINDING_CREATED' | 'AI_ASSET_RECOMMENDATION_CREATED' | 'AI_ASSET_REVIEWED' | 'AI_ASSET_ACTION_COMPLETED' | 'AI_SPEND_RECORD_INGESTED' | 'AI_SPEND_FINDING_CREATED' | 'AI_SPEND_RECOMMENDATION_CREATED' | 'AI_SPEND_ACTION_COMPLETED'

export interface AIAsset { id: string; tenantId: string; name: string; assetType: AIAssetType; vendor: string; status: AIAssetStatus; description?: string; ownerId?: string; department?: string; costCentre?: string; businessFunction?: string; environment?: string; riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'; approvalStatus: AIApprovalStatus; source: string; sourceSystem: string; discoveredAt: string; lastSeenAt: string; createdAt: string; updatedAt: string; metadata: Record<string, unknown> }
export type AIModel = AIAsset & { assetType: 'MODEL' }
export type AIAgent = AIAsset & { assetType: 'AGENT' }
export type MCPServer = AIAsset & { assetType: 'MCP_SERVER' }
export type AIWorkflow = AIAsset & { assetType: 'WORKFLOW' }
export type AITool = AIAsset & { assetType: 'TOOL' }
export type AIVendor = AIAsset & { assetType: 'VENDOR' }

export interface AIUsageRecord { id: string; tenantId: string; assetId: string; assetType: AIAssetType; periodStart: string; periodEnd: string; requestCount: number; executionCount: number; userCount: number; tokenCount: number; inputTokenCount: number; outputTokenCount: number; successCount: number; failureCount: number; lastUsedAt?: string; source: string; metadata: Record<string, unknown>; createdAt: string }
export type AIModelUsage = AIUsageRecord & { assetType: 'MODEL' }
export type AIAgentUsage = AIUsageRecord & { assetType: 'AGENT' }
export type MCPUsage = AIUsageRecord & { assetType: 'MCP_SERVER' }
export type AIWorkflowUsage = AIUsageRecord & { assetType: 'WORKFLOW' }
export interface AISpendRecord { id: string; tenantId: string; assetId: string; assetType: AIAssetType; vendor: string; periodStart: string; periodEnd: string; currency: string; totalSpend: number; tokenSpend: number; inferenceSpend: number; subscriptionSpend: number; seatSpend: number; workflowSpend: number; agentSpend: number; department?: string; costCentre?: string; source: string; metadata: Record<string, unknown>; createdAt: string }
export type AIModelSpend = AISpendRecord & { assetType: 'MODEL' }
export type AIAgentSpend = AISpendRecord & { assetType: 'AGENT' }
export type AIWorkflowSpend = AISpendRecord & { assetType: 'WORKFLOW' }
export type TokenSpend = AISpendRecord & { tokenSpend: number }
export type InferenceSpend = AISpendRecord & { inferenceSpend: number }

export interface AIGovernanceFinding { id: string; tenantId: string; assetId: string; findingType: AIGovernanceFindingType; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; evidenceId: string; status: 'OPEN' | 'RESOLVED'; createdAt: string; rationale: string }
export interface AIRecommendation { id: string; tenantId: string; assetId: string; recommendationType: AIRecommendationType; evidenceId: string; projectedSavings?: number; trustScore: number; readiness: 'APPROVAL_REQUIRED' | 'INVESTIGATE' | 'BLOCKED'; createdAt: string; rationale: string }
export interface AIEvidenceRecord { id: string; tenantId: string; entityId: string; evidenceType: AIEvidenceType; source: string; payload: Record<string, unknown>; createdAt: string }
export interface AIOutcomeLedgerEvent { eventId: string; timestamp: string; tenantId: string; entityId: string; entityType: 'AIAsset' | 'AIUsageRecord' | 'AISpendRecord' | 'AIGovernanceFinding' | 'AIRecommendation'; eventType: AIOutcomeLedgerEventType; actor: string; evidenceId?: string }

function now() { return new Date().toISOString() }
function id(prefix: string, ...parts: string[]) { return `${prefix}-${createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)}` }
function daysSince(iso?: string) { if (!iso) return 9999; const delta = Date.now() - new Date(iso).getTime(); return Number.isFinite(delta) ? Math.floor(delta / 86400000) : 9999 }
const outOfScopeTerms = [['Left', 'Shield'], ['attack', 'path'], ['exploit'], ['prompt', 'tracing'], ['MCP', 'attack'], ['runtime', 'security'], ['SDLC', 'security']].map((parts) => parts.join(' '))
const noSecurity = (value: unknown) => !new RegExp(outOfScopeTerms.join('|'), 'i').test(JSON.stringify(value ?? {}))

export class AIIntelligenceRepository {
  private static assets = new Map<string, AIAsset>()
  private static usage = new Map<string, AIUsageRecord>()
  private static spend = new Map<string, AISpendRecord>()
  private static evidence = new Map<string, AIEvidenceRecord>()
  private static ledger = new Map<string, AIOutcomeLedgerEvent>()
  upsertAsset(asset: AIAsset) { AIIntelligenceRepository.assets.set(`${asset.tenantId}:${asset.id}`, asset); return asset }
  getAsset(tenantId: string, assetId: string) { return AIIntelligenceRepository.assets.get(`${tenantId}:${assetId}`) ?? null }
  listAssets(tenantId: string, type?: AIAssetType) { return [...AIIntelligenceRepository.assets.values()].filter((asset) => asset.tenantId === tenantId && (!type || asset.assetType === type)) }
  upsertUsage(record: AIUsageRecord) { AIIntelligenceRepository.usage.set(`${record.tenantId}:${record.id}`, record); return record }
  listUsage(tenantId: string) { return [...AIIntelligenceRepository.usage.values()].filter((record) => record.tenantId === tenantId) }
  upsertSpend(record: AISpendRecord) { AIIntelligenceRepository.spend.set(`${record.tenantId}:${record.id}`, record); return record }
  listSpend(tenantId: string) { return [...AIIntelligenceRepository.spend.values()].filter((record) => record.tenantId === tenantId) }
  addEvidence(record: AIEvidenceRecord) { AIIntelligenceRepository.evidence.set(`${record.tenantId}:${record.id}`, record); return record }
  listEvidence(tenantId: string) { return [...AIIntelligenceRepository.evidence.values()].filter((record) => record.tenantId === tenantId) }
  addLedger(event: AIOutcomeLedgerEvent) { AIIntelligenceRepository.ledger.set(`${event.tenantId}:${event.eventId}`, event); return event }
  listLedger(tenantId: string) { return [...AIIntelligenceRepository.ledger.values()].filter((event) => event.tenantId === tenantId) }
  clearForTests() { AIIntelligenceRepository.assets.clear(); AIIntelligenceRepository.usage.clear(); AIIntelligenceRepository.spend.clear(); AIIntelligenceRepository.evidence.clear(); AIIntelligenceRepository.ledger.clear() }
}

export class AIIntelligenceService {
  constructor(private readonly repo = new AIIntelligenceRepository()) {}
  createAsset(tenantId: string, input: Partial<AIAsset> & { name: string; assetType: AIAssetType; vendor: string }) {
    if (!noSecurity(input)) throw new Error('AI_SECURITY_ANALYTICS_OUT_OF_SCOPE')
    const ts = now()
    const asset: AIAsset = { id: input.id ?? id('aiasset', tenantId, input.name, input.assetType, input.vendor), tenantId, name: input.name, assetType: input.assetType, vendor: input.vendor, status: input.status ?? 'DISCOVERED', description: input.description, ownerId: input.ownerId, department: input.department, costCentre: input.costCentre, businessFunction: input.businessFunction, environment: input.environment ?? 'UNKNOWN', riskLevel: input.riskLevel ?? 'UNKNOWN', approvalStatus: input.approvalStatus ?? 'UNKNOWN', source: input.source ?? 'MANUAL_ENTRY', sourceSystem: input.sourceSystem ?? 'CERTEN_AI_INTELLIGENCE', discoveredAt: input.discoveredAt ?? ts, lastSeenAt: input.lastSeenAt ?? ts, createdAt: input.createdAt ?? ts, updatedAt: ts, metadata: input.metadata ?? {} }
    this.repo.upsertAsset(asset)
    const evidence = this.evidence(tenantId, asset.id, 'AI_ASSET_DISCOVERED', { asset })
    void this.ledger(tenantId, asset.id, 'AIAsset', 'AI_ASSET_DISCOVERED', 'ai-intelligence', evidence.id)
    return asset
  }
  updateAsset(tenantId: string, assetId: string, patch: Partial<AIAsset>) {
    if (!noSecurity(patch)) throw new Error('AI_SECURITY_ANALYTICS_OUT_OF_SCOPE')
    const existing = this.repo.getAsset(tenantId, assetId)
    if (!existing) return null
    const updated = { ...existing, ...patch, id: existing.id, tenantId, updatedAt: now() }
    this.repo.upsertAsset(updated)
    if (patch.ownerId) this.evidence(tenantId, assetId, 'AI_ASSET_OWNER_ASSIGNED', { ownerId: patch.ownerId })
    if (patch.approvalStatus === 'APPROVED') this.evidence(tenantId, assetId, 'AI_ASSET_APPROVED', { approvalStatus: patch.approvalStatus })
    if (patch.status === 'BLOCKED') this.evidence(tenantId, assetId, 'AI_ASSET_BLOCKED', { status: patch.status })
    if (patch.status === 'RETIRED') this.evidence(tenantId, assetId, 'AI_ASSET_RETIRED', { status: patch.status })
    void this.ledger(tenantId, assetId, 'AIAsset', 'AI_ASSET_REVIEWED', 'ai-intelligence')
    return updated
  }
  listAssets(tenantId: string, type?: AIAssetType) { return this.repo.listAssets(tenantId, type) }
  getAsset(tenantId: string, assetId: string) { return this.repo.getAsset(tenantId, assetId) }
  ingestUsage(tenantId: string, input: Partial<AIUsageRecord> & { assetId: string }) {
    const asset = this.repo.getAsset(tenantId, input.assetId)
    if (!asset) throw new Error('AI_ASSET_NOT_FOUND')
    const ts = now()
    const record: AIUsageRecord = { id: input.id ?? id('aiusage', tenantId, input.assetId, input.periodStart ?? ts, input.periodEnd ?? ts), tenantId, assetId: input.assetId, assetType: input.assetType ?? asset.assetType, periodStart: input.periodStart ?? ts, periodEnd: input.periodEnd ?? ts, requestCount: Number(input.requestCount ?? 0), executionCount: Number(input.executionCount ?? 0), userCount: Number(input.userCount ?? 0), tokenCount: Number(input.tokenCount ?? 0), inputTokenCount: Number(input.inputTokenCount ?? 0), outputTokenCount: Number(input.outputTokenCount ?? 0), successCount: Number(input.successCount ?? 0), failureCount: Number(input.failureCount ?? 0), lastUsedAt: input.lastUsedAt, source: input.source ?? 'INTERNAL_API', metadata: input.metadata ?? {}, createdAt: ts }
    return this.repo.upsertUsage(record)
  }
  ingestSpend(tenantId: string, input: Partial<AISpendRecord> & { assetId: string; totalSpend: number }) {
    const asset = this.repo.getAsset(tenantId, input.assetId)
    if (!asset) throw new Error('AI_ASSET_NOT_FOUND')
    const ts = now()
    const record: AISpendRecord = { id: input.id ?? id('aispend', tenantId, input.assetId, input.periodStart ?? ts, input.periodEnd ?? ts), tenantId, assetId: input.assetId, assetType: input.assetType ?? asset.assetType, vendor: input.vendor ?? asset.vendor, periodStart: input.periodStart ?? ts, periodEnd: input.periodEnd ?? ts, currency: input.currency ?? 'USD', totalSpend: Number(input.totalSpend ?? 0), tokenSpend: Number(input.tokenSpend ?? 0), inferenceSpend: Number(input.inferenceSpend ?? 0), subscriptionSpend: Number(input.subscriptionSpend ?? 0), seatSpend: Number(input.seatSpend ?? 0), workflowSpend: Number(input.workflowSpend ?? 0), agentSpend: Number(input.agentSpend ?? 0), department: input.department ?? asset.department, costCentre: input.costCentre ?? asset.costCentre, source: input.source ?? 'INTERNAL_API', metadata: input.metadata ?? {}, createdAt: ts }
    this.repo.upsertSpend(record)
    const evidence = this.evidence(tenantId, record.id, 'AI_SPEND_RECORD_INGESTED', { spend: record })
    void this.ledger(tenantId, record.id, 'AISpendRecord', 'AI_SPEND_RECORD_INGESTED', 'ai-spend-intelligence', evidence.id)
    return record
  }
  listUsage(tenantId: string) { const records = this.repo.listUsage(tenantId); return { tenantId, summary: summarizeUsage(this.repo.listAssets(tenantId), records), records, usageByType: groupSum(records, 'assetType', 'requestCount'), usageByVendor: this.usageByVendor(tenantId), usageByDepartment: this.usageByDepartment(tenantId), highestUsedAssets: [...records].sort((a, b) => (b.requestCount + b.executionCount) - (a.requestCount + a.executionCount)).slice(0, 5), dormantAssets: this.dormantAssets(tenantId) } }
  listSpend(tenantId: string) { const records = this.repo.listSpend(tenantId); return { tenantId, summary: summarizeSpend(records), records, spendByVendor: groupSum(records, 'vendor', 'totalSpend'), spendByModel: this.spendByAssetType(tenantId, 'MODEL'), spendByAgent: this.spendByAssetType(tenantId, 'AGENT'), spendByWorkflow: this.spendByAssetType(tenantId, 'WORKFLOW'), spendByDepartment: groupSum(records, 'department', 'totalSpend'), spendByCostCentre: groupSum(records, 'costCentre', 'totalSpend'), monthlyTrend: groupByMonth(records), highSpendLowUsageAssets: this.highCostLowUsageAssets(tenantId) } }
  findings(tenantId: string) {
    const findings: AIGovernanceFinding[] = []
    const assets = this.repo.listAssets(tenantId)
    const usage = this.repo.listUsage(tenantId)
    const spend = this.repo.listSpend(tenantId)
    const push = (asset: AIAsset, findingType: AIGovernanceFindingType, severity: AIGovernanceFinding['severity'], rationale: string) => { const evidence = this.evidence(tenantId, asset.id, findingType.includes('SPEND') ? 'AI_SPEND_FINDING_CREATED' : 'AI_ASSET_REVIEWED', { findingType, rationale }); const finding = { id: id('aifinding', tenantId, asset.id, findingType), tenantId, assetId: asset.id, findingType, severity, evidenceId: evidence.id, status: 'OPEN' as const, createdAt: now(), rationale }; findings.push(finding); void this.ledger(tenantId, finding.id, 'AIGovernanceFinding', findingType.includes('SPEND') ? 'AI_SPEND_FINDING_CREATED' : 'AI_ASSET_GOVERNANCE_FINDING_CREATED', 'ai-governance', evidence.id) }
    for (const asset of assets) {
      if (!asset.ownerId) push(asset, 'UNOWNED_AI_ASSET', 'HIGH', 'AI asset has no accountable owner')
      if (asset.approvalStatus !== 'APPROVED') push(asset, 'UNAPPROVED_AI_ASSET', 'HIGH', 'AI asset is not approved for governed use')
      if (!asset.costCentre) push(asset, 'MISSING_COST_CENTRE', 'MEDIUM', 'AI asset is missing cost centre linkage')
      if (asset.status === 'INACTIVE') push(asset, 'INACTIVE_AI_ASSET', 'MEDIUM', 'AI asset is marked inactive')
      if (daysSince(asset.lastSeenAt) > 90) push(asset, 'STALE_AI_ASSET', 'MEDIUM', 'AI asset has not been seen in more than 90 days')
      const assetUsage = usage.filter((r) => r.assetId === asset.id)
      const totalActivity = assetUsage.reduce((sum, r) => sum + r.requestCount + r.executionCount + r.userCount, 0)
      if (totalActivity === 0 && ['MODEL', 'AGENT', 'MCP_SERVER', 'WORKFLOW'].includes(asset.assetType)) push(asset, unusedFinding(asset.assetType), 'MEDIUM', 'AI asset has no observed usage')
      const assetSpend = spend.filter((r) => r.assetId === asset.id).reduce((sum, r) => sum + r.totalSpend, 0)
      if (assetSpend >= 1000) push(asset, 'HIGH_AI_SPEND', 'HIGH', 'AI spend exceeds high-spend threshold')
      if (assetSpend > 0 && !asset.ownerId) push(asset, 'AI_SPEND_WITHOUT_OWNER', 'HIGH', 'AI spend has no owner')
      if (assetSpend > 0 && totalActivity === 0) push(asset, 'AI_SPEND_WITHOUT_USAGE', 'HIGH', 'AI spend has no usage evidence')
      if (assetSpend >= 500 && totalActivity < 10) push(asset, 'HIGH_COST_LOW_USAGE_AI_ASSET', 'HIGH', 'AI asset has high cost and low usage')
      if (assetSpend > 0 && !asset.costCentre) push(asset, 'UNKNOWN_AI_COST_CENTRE', 'MEDIUM', 'AI spend lacks cost centre')
    }
    return dedupe(findings, (f) => f.id)
  }
  recommendations(tenantId: string) {
    const assets = this.repo.listAssets(tenantId)
    const recs: AIRecommendation[] = []
    for (const finding of this.findings(tenantId)) {
      const asset = assets.find((item) => item.id === finding.assetId)
      if (!asset) continue
      const recommendationType = recommendationFor(finding.findingType, asset.assetType)
      const evidence = this.evidence(tenantId, finding.assetId, finding.findingType.includes('SPEND') ? 'AI_SPEND_RECOMMENDATION_CREATED' : 'AI_ASSET_REVIEWED', { finding, recommendationType })
      const rec: AIRecommendation = { id: id('airec', tenantId, finding.assetId, recommendationType), tenantId, assetId: finding.assetId, recommendationType, evidenceId: evidence.id, projectedSavings: projectedSavings(this.repo.listSpend(tenantId).filter((r) => r.assetId === finding.assetId)), trustScore: 80, readiness: 'APPROVAL_REQUIRED', createdAt: now(), rationale: finding.rationale }
      recs.push(rec)
      void this.ledger(tenantId, rec.id, 'AIRecommendation', recommendationType.includes('SPEND') || finding.findingType.includes('SPEND') ? 'AI_SPEND_RECOMMENDATION_CREATED' : 'AI_ASSET_RECOMMENDATION_CREATED', 'ai-recommendation-engine', evidence.id)
    }
    return dedupe(recs, (r) => r.id)
  }
  dashboard(tenantId: string) { const assets = this.repo.listAssets(tenantId); const usage = this.listUsage(tenantId); const spend = this.listSpend(tenantId); const findings = this.findings(tenantId); const recommendations = this.recommendations(tenantId); return { tenantId, assets, summary: { totalAIAssets: assets.length, activeAIAssets: assets.filter((a) => a.status === 'ACTIVE').length, inactiveAIAssets: assets.filter((a) => a.status === 'INACTIVE').length, unusedAIAssets: usage.dormantAssets.length, totalAISpend: spend.summary.totalAISpend, governanceFindings: findings.length, recommendations: recommendations.length }, usage, spend, findings, recommendations, evidence: this.repo.listEvidence(tenantId), outcomeLedger: this.repo.listLedger(tenantId) } }
  commandDashboard(tenantId: string) { const assets = this.repo.listAssets(tenantId); const spend = this.listSpend(tenantId); const findings = this.findings(tenantId); const recommendations = this.recommendations(tenantId); const evidence = this.repo.listEvidence(tenantId); const topRecommendations = recommendations.sort((a, b) => Number(b.projectedSavings ?? 0) - Number(a.projectedSavings ?? 0)).slice(0, 5); return { tenantId, summary: { totalAIAssets: assets.length, approvedAIAssets: assets.filter((asset) => asset.approvalStatus === 'APPROVED').length, unapprovedAIAssets: assets.filter((asset) => asset.approvalStatus !== 'APPROVED').length, ownedAIAssets: assets.filter((asset) => Boolean(asset.ownerId)).length, unownedAIAssets: assets.filter((asset) => !asset.ownerId).length, activeAIAssets: assets.filter((asset) => asset.status === 'ACTIVE').length, inactiveAIAssets: assets.filter((asset) => asset.status === 'INACTIVE').length, totalAISpend: spend.summary.totalAISpend, highCostLowUsageAssets: spend.highSpendLowUsageAssets.length }, topRecommendations, evidenceReadySavingsOpportunities: recommendations.filter((rec) => Number(rec.projectedSavings ?? 0) > 0 && evidence.some((item) => item.id === rec.evidenceId)), governanceFindings: findings } }
  recommendationDetail(tenantId: string, recommendationId: string) { const recommendation = this.recommendations(tenantId).find((rec) => rec.id === recommendationId); if (!recommendation) return null; const asset = this.repo.getAsset(tenantId, recommendation.assetId); const finding = this.findings(tenantId).find((item) => item.assetId === recommendation.assetId && recommendationFor(item.findingType, asset?.assetType ?? 'TOOL') === recommendation.recommendationType); return { tenantId, recommendation, finding, evidence: this.repo.listEvidence(tenantId).filter((item) => item.id === recommendation.evidenceId || item.entityId === recommendation.assetId), affectedAsset: asset, owner: asset?.ownerId ?? 'Unassigned', expectedSaving: recommendation.projectedSavings ?? 0, actionPath: playbookActionPath(recommendation.recommendationType), governanceStatus: recommendation.readiness, ledgerHistory: this.repo.listLedger(tenantId).filter((event) => event.entityId === recommendation.id || event.entityId === recommendation.assetId || event.evidenceId === recommendation.evidenceId) } }
  optimisationPlaybooks(tenantId: string) { const recommendations = this.recommendations(tenantId); return (['ASSIGN_AI_OWNER', 'APPROVE_OR_BLOCK_AI_ASSET', 'RETIRE_INACTIVE_AI_ASSET', 'OPTIMISE_HIGH_COST_LOW_USAGE_AI_ASSET', 'CONSOLIDATE_DUPLICATE_AI_CAPABILITY'] as AIRecommendationType[]).map((playbook) => ({ playbookId: playbook, name: playbookName(playbook), actionPath: playbookActionPath(playbook), eligibleRecommendations: recommendations.filter((rec) => rec.recommendationType === playbook) })) }
  completeRecommendationAction(tenantId: string, recommendationId: string, actor = 'ai-economic-operator') { const detail = this.recommendationDetail(tenantId, recommendationId); if (!detail) return null; const evidence = this.evidence(tenantId, recommendationId, 'AI_ASSET_REVIEWED', { recommendationId, actionPath: detail.actionPath, completedAt: now() }); void this.ledger(tenantId, recommendationId, 'AIRecommendation', detail.recommendation.recommendationType.includes('SPEND') ? 'AI_SPEND_ACTION_COMPLETED' : 'AI_ASSET_ACTION_COMPLETED', actor, evidence.id); return { status: 'COMPLETED' as const, recommendationId, evidenceId: evidence.id, ledgerEvent: 'AI_ASSET_ACTION_COMPLETED' } }
  executiveProofPack(tenantId: string) { const assets = this.repo.listAssets(tenantId); const command = this.commandDashboard(tenantId); const spend = this.listSpend(tenantId); const findings = this.findings(tenantId); const recommendations = this.recommendations(tenantId); const ledger = this.repo.listLedger(tenantId); return { tenantId, generatedAt: now(), aiEstateSummary: command.summary, spendExposure: { totalAISpend: spend.summary.totalAISpend, highCostLowUsageAssets: command.summary.highCostLowUsageAssets, spendByVendor: spend.spendByVendor, spendByDepartment: spend.spendByDepartment }, governanceGaps: findings.map((finding) => ({ findingType: finding.findingType, severity: finding.severity, assetId: finding.assetId, evidenceId: finding.evidenceId })), optimisationOpportunities: recommendations.map((rec) => ({ recommendationId: rec.id, type: rec.recommendationType, assetId: rec.assetId, expectedSaving: rec.projectedSavings ?? 0, evidenceId: rec.evidenceId })), actionsTaken: ledger.filter((event) => event.eventType === 'AI_ASSET_ACTION_COMPLETED' || event.eventType === 'AI_SPEND_ACTION_COMPLETED'), outcomeLedgerEvidence: ledger, assetCountByType: groupBy(assets, (asset) => asset.assetType, () => 1) } }
  technologyPortfolio(tenantId: string) { return { section: 'AI Assets', tabs: ['All AI Assets', 'Models', 'Agents', 'MCP Servers', 'Workflows', 'Tools', 'Vendors'], rows: this.repo.listAssets(tenantId).map((asset) => ({ name: asset.name, type: asset.assetType, vendor: asset.vendor, owner: asset.ownerId ?? 'Unassigned', department: asset.department ?? 'Unknown', status: asset.status, approval: asset.approvalStatus, lastSeen: asset.lastSeenAt, governanceFlags: this.findings(tenantId).filter((finding) => finding.assetId === asset.id).map((finding) => finding.findingType) })) } }
  private evidence(tenantId: string, entityId: string, evidenceType: AIEvidenceType | AIGovernanceFindingType, payload: Record<string, unknown>) { return this.repo.addEvidence({ id: id('aievidence', tenantId, entityId, String(evidenceType), JSON.stringify(payload)), tenantId, entityId, evidenceType: normalizeEvidenceType(evidenceType), source: 'CERTEN_AI_INTELLIGENCE', payload, createdAt: now() }) }
  private async ledger(tenantId: string, entityId: string, entityType: AIOutcomeLedgerEvent['entityType'], eventType: AIOutcomeLedgerEventType, actor: string, evidenceId?: string) { const event = this.repo.addLedger({ eventId: randomUUID(), timestamp: now(), tenantId, entityId, entityType, eventType, actor, evidenceId }); await platformEventService.recordNormalizedEvent({ tenantId, category: eventType.includes('SPEND') ? 'OUTCOME' : 'SYSTEM', type: eventType, eventId: event.eventId, timestamp: event.timestamp, entityType, entityId, actorId: actor, evidenceRef: evidenceId, sourceSystem: 'ai-economic-control', metadata: event }).catch(() => undefined); return event }
  private usageByVendor(tenantId: string) { const assets = new Map(this.repo.listAssets(tenantId).map((a) => [a.id, a])); return groupBy(this.repo.listUsage(tenantId), (record) => assets.get(record.assetId)?.vendor ?? 'Unknown', (record) => record.requestCount + record.executionCount) }
  private usageByDepartment(tenantId: string) { const assets = new Map(this.repo.listAssets(tenantId).map((a) => [a.id, a])); return groupBy(this.repo.listUsage(tenantId), (record) => assets.get(record.assetId)?.department ?? 'Unknown', (record) => record.requestCount + record.executionCount) }
  private dormantAssets(tenantId: string) { const usage = this.repo.listUsage(tenantId); return this.repo.listAssets(tenantId).filter((asset) => usage.filter((r) => r.assetId === asset.id).reduce((sum, r) => sum + r.requestCount + r.executionCount + r.userCount, 0) === 0) }
  private highCostLowUsageAssets(tenantId: string) { const usage = this.repo.listUsage(tenantId); return this.repo.listSpend(tenantId).filter((spend) => spend.totalSpend >= 500 && usage.filter((u) => u.assetId === spend.assetId).reduce((sum, u) => sum + u.requestCount + u.executionCount, 0) < 10) }
  private spendByAssetType(tenantId: string, assetType: AIAssetType) { return this.repo.listSpend(tenantId).filter((record) => record.assetType === assetType).map((record) => ({ assetId: record.assetId, totalSpend: record.totalSpend, vendor: record.vendor })) }
}

function normalizeEvidenceType(value: AIEvidenceType | AIGovernanceFindingType): AIEvidenceType { if (String(value).includes('SPEND')) return 'AI_SPEND_FINDING_CREATED'; if (String(value).includes('APPROVED')) return 'AI_ASSET_APPROVED'; return 'AI_ASSET_REVIEWED' }
function unusedFinding(type: AIAssetType): AIGovernanceFindingType { return type === 'MODEL' ? 'UNUSED_AI_MODEL' : type === 'AGENT' ? 'UNUSED_AI_AGENT' : type === 'MCP_SERVER' ? 'UNUSED_MCP_SERVER' : 'UNUSED_AI_WORKFLOW' }
function recommendationFor(finding: AIGovernanceFindingType, assetType: AIAssetType): AIRecommendationType { if (finding === 'UNOWNED_AI_ASSET' || finding === 'UNKNOWN_AI_OWNER') return 'ASSIGN_AI_OWNER'; if (finding === 'UNAPPROVED_AI_ASSET') return 'APPROVE_OR_BLOCK_AI_ASSET'; if (finding === 'INACTIVE_AI_ASSET') return 'RETIRE_INACTIVE_AI_ASSET'; if (finding === 'DUPLICATE_AI_CAPABILITY') return 'CONSOLIDATE_DUPLICATE_AI_CAPABILITY'; if (finding === 'UNUSED_AI_AGENT') return 'RETIRE_UNUSED_AI_AGENT'; if (finding === 'UNUSED_MCP_SERVER') return 'REVIEW_UNUSED_MCP_SERVER'; if (finding === 'UNUSED_AI_WORKFLOW') return 'CONSOLIDATE_LOW_USAGE_WORKFLOW'; if (finding === 'FAILED_AI_WORKFLOW') return 'REVIEW_FAILED_AI_WORKFLOW'; if (finding === 'LOW_USAGE_HIGH_COST_AI_ASSET' || finding === 'HIGH_COST_LOW_USAGE_AI_ASSET') return 'OPTIMISE_HIGH_COST_LOW_USAGE_AI_ASSET'; if (finding === 'HIGH_AI_SPEND') return 'REVIEW_HIGH_AI_SPEND'; if (finding === 'AI_SPEND_WITHOUT_OWNER') return 'ASSIGN_AI_SPEND_OWNER'; if (finding === 'AI_SPEND_WITHOUT_USAGE') return 'REDUCE_IDLE_AI_SPEND'; if (finding === 'DUPLICATE_AI_SPEND') return 'CONSOLIDATE_DUPLICATE_AI_SPEND'; if (assetType === 'MODEL') return 'REVIEW_AI_ASSET'; return 'REVIEW_LOW_USAGE_HIGH_COST_AI_ASSET' }
function summarizeUsage(assets: AIAsset[], records: AIUsageRecord[]) { return { totalAIAssets: assets.length, activeAIAssets: assets.filter((asset) => asset.status === 'ACTIVE').length, inactiveAIAssets: assets.filter((asset) => asset.status === 'INACTIVE').length, unusedAIAssets: assets.filter((asset) => !records.some((record) => record.assetId === asset.id && (record.requestCount + record.executionCount + record.userCount) > 0)).length } }
function summarizeSpend(records: AISpendRecord[]) { return { totalAISpend: records.reduce((sum, record) => sum + record.totalSpend, 0), records: records.length } }
function groupSum<T extends Record<string, any>>(records: T[], key: keyof T, value: keyof T) { return groupBy(records, (record) => String(record[key] ?? 'Unknown'), (record) => Number(record[value] ?? 0)) }
function groupBy<T>(records: T[], keyFn: (record: T) => string, valueFn: (record: T) => number) { const out = new Map<string, number>(); for (const record of records) out.set(keyFn(record), (out.get(keyFn(record)) ?? 0) + valueFn(record)); return [...out.entries()].map(([key, value]) => ({ key, value })) }
function groupByMonth(records: AISpendRecord[]) { return groupBy(records, (record) => record.periodStart.slice(0, 7), (record) => record.totalSpend) }
function playbookName(type: AIRecommendationType) { return type === 'ASSIGN_AI_OWNER' ? 'Assign owner' : type === 'APPROVE_OR_BLOCK_AI_ASSET' ? 'Review unapproved AI asset' : type === 'RETIRE_INACTIVE_AI_ASSET' ? 'Retire inactive AI asset' : type === 'OPTIMISE_HIGH_COST_LOW_USAGE_AI_ASSET' ? 'Review high-cost / low-usage asset' : type === 'CONSOLIDATE_DUPLICATE_AI_CAPABILITY' ? 'Consolidate duplicate AI capability' : 'Review AI asset' }
function playbookActionPath(type: AIRecommendationType) { return type === 'ASSIGN_AI_OWNER' ? ['Identify business owner', 'Assign accountable owner', 'Record owner evidence'] : type === 'APPROVE_OR_BLOCK_AI_ASSET' ? ['Review approval evidence', 'Approve governed use or block asset', 'Record decision'] : type === 'RETIRE_INACTIVE_AI_ASSET' ? ['Validate inactivity', 'Notify owner', 'Retire or mark exception'] : type === 'OPTIMISE_HIGH_COST_LOW_USAGE_AI_ASSET' ? ['Review spend and usage', 'Right-size subscription or usage pattern', 'Track saving evidence'] : type === 'CONSOLIDATE_DUPLICATE_AI_CAPABILITY' ? ['Compare duplicate capability', 'Select preferred asset', 'Retire duplicate spend'] : ['Review finding', 'Approve action', 'Record outcome'] }
function projectedSavings(records: AISpendRecord[]) { const spend = records.reduce((sum, record) => sum + record.totalSpend, 0); return spend > 0 ? Number((spend * 0.25).toFixed(2)) : undefined }
function dedupe<T>(records: T[], keyFn: (record: T) => string) { return [...new Map(records.map((record) => [keyFn(record), record])).values()] }

export const aiIntelligenceRepository = new AIIntelligenceRepository()
export const aiIntelligenceService = new AIIntelligenceService(aiIntelligenceRepository)
