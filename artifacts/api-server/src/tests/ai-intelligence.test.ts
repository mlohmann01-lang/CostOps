import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { aiIntelligenceRepository, aiIntelligenceService } from '../lib/ai-economic-control/ai-intelligence'

function reset() { aiIntelligenceRepository.clearForTests() }

test('AI assets can be created listed filtered and updated', () => {
  reset()
  const model = aiIntelligenceService.createAsset('tenant-ai', { name: 'GPT-4o Support Model', assetType: 'MODEL', vendor: 'OpenAI', ownerId: 'owner-1', department: 'Support', approvalStatus: 'APPROVED', costCentre: 'CC-SUPPORT' })
  aiIntelligenceService.createAsset('tenant-ai', { name: 'Research Agent', assetType: 'AGENT', vendor: 'Anthropic' })
  assert.equal(aiIntelligenceService.listAssets('tenant-ai').length, 2)
  assert.equal(aiIntelligenceService.listAssets('tenant-ai', 'MODEL')[0].id, model.id)
  assert.equal(aiIntelligenceService.updateAsset('tenant-ai', model.id, { status: 'ACTIVE' })?.status, 'ACTIVE')
})

test('AI assets appear in Technology Portfolio rows and tabs', () => {
  reset()
  aiIntelligenceService.createAsset('tenant-ai', { name: 'MCP Finance Server', assetType: 'MCP_SERVER', vendor: 'Internal AI Platform', department: 'Finance' })
  const portfolio = aiIntelligenceService.technologyPortfolio('tenant-ai')
  assert.equal(portfolio.section, 'AI Assets')
  assert.ok(portfolio.tabs.includes('MCP Servers'))
  assert.equal(portfolio.rows[0].name, 'MCP Finance Server')
})

test('unowned and unapproved AI assets generate findings evidence recommendations and ledger events', () => {
  reset()
  const asset = aiIntelligenceService.createAsset('tenant-ai', { name: 'Unowned Agent', assetType: 'AGENT', vendor: 'Anthropic', approvalStatus: 'UNAPPROVED' })
  const findings = aiIntelligenceService.findings('tenant-ai')
  assert.ok(findings.some((f) => f.findingType === 'UNOWNED_AI_ASSET'))
  assert.ok(findings.some((f) => f.findingType === 'UNAPPROVED_AI_ASSET'))
  const recommendations = aiIntelligenceService.recommendations('tenant-ai')
  assert.ok(recommendations.some((r) => r.recommendationType === 'ASSIGN_AI_OWNER'))
  assert.ok(aiIntelligenceRepository.listEvidence('tenant-ai').some((e) => e.entityId === asset.id))
  assert.ok(aiIntelligenceRepository.listLedger('tenant-ai').some((e) => e.eventType === 'AI_ASSET_GOVERNANCE_FINDING_CREATED'))
})

test('AI usage records attach to assets and unused AI assets generate recommendations', () => {
  reset()
  const used = aiIntelligenceService.createAsset('tenant-ai', { name: 'Active Model', assetType: 'MODEL', vendor: 'OpenAI', ownerId: 'owner', approvalStatus: 'APPROVED', costCentre: 'CC1' })
  const unused = aiIntelligenceService.createAsset('tenant-ai', { name: 'Dormant Agent', assetType: 'AGENT', vendor: 'OpenAI', ownerId: 'owner', approvalStatus: 'APPROVED', costCentre: 'CC1' })
  const usage = aiIntelligenceService.ingestUsage('tenant-ai', { assetId: used.id, requestCount: 100, userCount: 5 })
  assert.equal(usage.assetId, used.id)
  assert.ok(aiIntelligenceService.listUsage('tenant-ai').dormantAssets.some((asset) => asset.id === unused.id))
  assert.ok(aiIntelligenceService.recommendations('tenant-ai').some((r) => r.assetId === unused.id && r.recommendationType === 'RETIRE_UNUSED_AI_AGENT'))
})

test('AI spend records attach to assets and high-cost low-usage recommendations are produced', () => {
  reset()
  const asset = aiIntelligenceService.createAsset('tenant-ai', { name: 'Expensive Workflow', assetType: 'WORKFLOW', vendor: 'Azure OpenAI', ownerId: 'owner', approvalStatus: 'APPROVED', costCentre: 'CC-AI' })
  const spend = aiIntelligenceService.ingestSpend('tenant-ai', { assetId: asset.id, totalSpend: 2500, workflowSpend: 2500, periodStart: '2026-06-01T00:00:00Z', periodEnd: '2026-06-30T00:00:00Z' })
  assert.equal(spend.assetId, asset.id)
  assert.ok(aiIntelligenceService.listSpend('tenant-ai').highSpendLowUsageAssets.some((record) => record.assetId === asset.id))
  assert.ok(aiIntelligenceService.recommendations('tenant-ai').some((r) => r.recommendationType === 'OPTIMISE_HIGH_COST_LOW_USAGE_AI_ASSET'))
  assert.ok(aiIntelligenceRepository.listLedger('tenant-ai').some((event) => event.eventType === 'AI_SPEND_RECORD_INGESTED'))
})



test('AI economic command dashboard detail playbooks and proof pack are generated with ledger evidence', () => {
  reset()
  const asset = aiIntelligenceService.createAsset('tenant-ai', { name: 'High Cost Model', assetType: 'MODEL', vendor: 'OpenAI', ownerId: 'owner', approvalStatus: 'APPROVED', costCentre: 'CC-AI', status: 'ACTIVE' })
  aiIntelligenceService.ingestSpend('tenant-ai', { assetId: asset.id, totalSpend: 3000, tokenSpend: 2000 })
  const dashboard = aiIntelligenceService.commandDashboard('tenant-ai')
  assert.equal(dashboard.summary.totalAIAssets, 1)
  assert.equal(dashboard.summary.highCostLowUsageAssets, 1)
  assert.ok(dashboard.topRecommendations.length > 0)
  assert.ok(dashboard.evidenceReadySavingsOpportunities.length > 0)
  const rec = dashboard.topRecommendations[0]
  const detail = aiIntelligenceService.recommendationDetail('tenant-ai', rec.id)
  assert.equal(detail?.affectedAsset?.id, asset.id)
  assert.ok((detail?.actionPath ?? []).length > 0)
  assert.ok((detail?.ledgerHistory ?? []).length > 0)
  assert.ok(aiIntelligenceService.optimisationPlaybooks('tenant-ai').some((playbook) => playbook.name === 'Review high-cost / low-usage asset'))
  const completion = aiIntelligenceService.completeRecommendationAction('tenant-ai', rec.id)
  assert.equal(completion?.status, 'COMPLETED')
  const proof = aiIntelligenceService.executiveProofPack('tenant-ai')
  assert.equal(proof.aiEstateSummary.totalAIAssets, 1)
  assert.ok(proof.spendExposure.totalAISpend >= 3000)
  assert.ok(proof.outcomeLedgerEvidence.some((event) => event.eventType === 'AI_ASSET_ACTION_COMPLETED'))
})

test('no Agent Security Analytics or LeftShield risk objects are introduced in AI intelligence layer', () => {
  const source = fs.readFileSync('src/lib/ai-economic-control/ai-intelligence.ts', 'utf8')
  assert.equal(/LeftShield|agent security posture|runtime exploit detection|MCP attack paths|SDLC security enforcement|Prompt tracing/i.test(source), false)
  assert.throws(() => aiIntelligenceService.createAsset('tenant-ai', { name: 'Bad Asset', assetType: 'AGENT', vendor: 'Bad', metadata: { note: 'MCP attack path' } }), /AI_SECURITY_ANALYTICS_OUT_OF_SCOPE/)
})

test('AI connector discovery ingests real connector telemetry into assets usage spend findings and recommendations', async () => {
  reset()
  const fetchImpl = async (url: string | URL | Request) => {
    const text = String(url)
    if (text.includes('/v1/models')) return new Response(JSON.stringify({ data: [{ id: 'gpt-4o' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    if (text.includes('/v1/organization/projects')) return new Response(JSON.stringify({ data: [{ id: 'sales-agent-a', name: 'Sales Agent A', ownerId: '' }, { id: 'sales-agent-b', name: 'Sales Agent B' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    if (text.includes('/v1/organization/users')) return new Response(JSON.stringify({ data: [{ id: 'u1', email: 'employee@example.com' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    if (text.includes('/v1/organization/usage')) return new Response(JSON.stringify({ data: [{ model: 'gpt-4o', requests: 12, input_tokens: 1000, output_tokens: 500, users: 2, date: '2026-06-01T00:00:00Z' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    if (text.includes('/v1/organization/costs')) return new Response(JSON.stringify({ data: [{ model: 'gpt-4o', cost_usd: 1500, date: '2026-06-01T00:00:00Z' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const { aiConnectorDiscoveryService } = await import('../lib/ai-economic-control/ai-discovery-connectors')
  const result = await aiConnectorDiscoveryService.discover('tenant-ai', { connectorId: 'OPENAI', apiKey: 'test-key', fetchImpl: fetchImpl as typeof fetch })
  assert.equal(result.status, 'COMPLETED')
  assert.ok(result.summary.discoveredAssets >= 3)
  assert.equal(result.summary.usageRecords, 1)
  assert.equal(result.summary.spendRecords, 1)
  assert.ok(result.rawSources.some((source) => source.source === '/v1/models'))
  assert.ok(aiIntelligenceService.listAssets('tenant-ai').some((asset) => asset.name === 'gpt-4o'))
  assert.ok(aiIntelligenceService.findings('tenant-ai').some((finding) => finding.findingType === 'UNOWNED_AI_ASSET' || finding.findingType === 'UNAPPROVED_AI_ASSET'))
  assert.ok(aiIntelligenceService.recommendations('tenant-ai').some((rec) => rec.recommendationType === 'REVIEW_HIGH_AI_SPEND' || rec.recommendationType === 'OPTIMISE_HIGH_COST_LOW_USAGE_AI_ASSET'))
})

test('AI connector catalog covers priority tiers and blocks missing credentials', async () => {
  const { aiConnectorDiscoveryService } = await import('../lib/ai-economic-control/ai-discovery-connectors')
  const ids = aiConnectorDiscoveryService.catalog().map((item) => item.connectorId)
  for (const id of ['OPENAI', 'ANTHROPIC', 'GITHUB_COPILOT', 'MICROSOFT_COPILOT', 'CURSOR', 'CLAUDE_TEAMS', 'GEMINI_ENTERPRISE', 'AZURE_OPENAI', 'LANGGRAPH', 'CREWAI', 'OPENAI_AGENTS', 'CUSTOM_MCP_REGISTRY']) assert.ok(ids.includes(id as any))
  const readiness = aiConnectorDiscoveryService.validate({ connectorId: 'OPENAI' })
  assert.equal(readiness.status, 'BLOCKED')
  assert.ok(readiness.missing.includes('apiKey'))
})
