import { test } from 'node:test'
import assert from 'node:assert/strict'

// ---------------------------------------------------------------------------
// Tests for AI Governance Packs
// These tests verify that each pack is correctly compiled and registers itself,
// and that the pack lifecycle (evidence → recommendations → simulation →
// verification → drift) works end-to-end.
// ---------------------------------------------------------------------------

test('AI token governance pack is registered in globalPackRegistry', async () => {
  // Import pack to trigger registration side-effect
  await import('../lib/packs/ai/ai-token-governance-pack.js')
  const { globalPackRegistry } = await import('../lib/economic-operations-pack-registry.js')
  const pack = globalPackRegistry.get('ai-token-governance')
  assert.ok(pack !== undefined, 'ai-token-governance pack should be registered')
  assert.equal(pack!.definition.domain, 'AI_GOVERNANCE')
  assert.equal(pack!.definition.category, 'TOKEN_GOVERNANCE')
})

test('AI token governance pack generates recommendations from evidence', async () => {
  const { aiTokenGovernancePack } = await import('../lib/packs/ai/ai-token-governance-pack.js')
  const recs = await aiTokenGovernancePack.runRecommendations('TENANT-AI-TEST', {})
  assert.ok(Array.isArray(recs))
  assert.ok(recs.length > 0, 'Should generate at least one recommendation')
})

test('AI token governance pack runs simulation', async () => {
  const { aiTokenGovernancePack } = await import('../lib/packs/ai/ai-token-governance-pack.js')
  const evidence = await aiTokenGovernancePack.definition.evidenceLayer.collector.collect('TENANT-AI-TEST', {})
  const sim = await aiTokenGovernancePack.runSimulation('TENANT-AI-TEST', 'exec-ai-1', evidence)
  assert.ok(sim !== null)
})

test('AI token governance pack drift detection runs', async () => {
  const { aiTokenGovernancePack } = await import('../lib/packs/ai/ai-token-governance-pack.js')
  const results = await aiTokenGovernancePack.detectDrift('TENANT-AI-TEST', 'exec-ai-1')
  assert.ok(Array.isArray(results))
  assert.ok(results.length > 0, 'Token governance pack should have drift rules')
})

test('AI model routing pack is registered', async () => {
  await import('../lib/packs/ai/ai-model-routing-pack.js')
  const { globalPackRegistry } = await import('../lib/economic-operations-pack-registry.js')
  const pack = globalPackRegistry.get('ai-model-routing')
  assert.ok(pack !== undefined)
  assert.equal(pack!.definition.category, 'MODEL_ROUTING')
})

test('AI model routing pack generates routing recommendations', async () => {
  const { aiModelRoutingPack } = await import('../lib/packs/ai/ai-model-routing-pack.js')
  const recs = await aiModelRoutingPack.runRecommendations('TENANT-AI-TEST', {})
  assert.ok(Array.isArray(recs))
  assert.ok(recs.length > 0)
})

test('AI vendor governance pack is registered', async () => {
  await import('../lib/packs/ai/ai-vendor-governance-pack.js')
  const { globalPackRegistry } = await import('../lib/economic-operations-pack-registry.js')
  const pack = globalPackRegistry.get('ai-vendor-seat-reclaim')
  assert.ok(pack !== undefined)
  assert.equal(pack!.definition.category, 'VENDOR_GOVERNANCE')
})

test('AI vendor governance pack identifies idle seats', async () => {
  const { aiVendorGovernancePack } = await import('../lib/packs/ai/ai-vendor-governance-pack.js')
  const evidence = await aiVendorGovernancePack.definition.evidenceLayer.collector.collect('TENANT-AI-TEST', {})
  const evidenceTyped = evidence as { idleSeatCount: number }
  assert.ok(evidenceTyped.idleSeatCount > 0, 'Should detect idle seats from mock data')
})

test('AI vendor governance pack generates seat reclaim recommendations', async () => {
  const { aiVendorGovernancePack } = await import('../lib/packs/ai/ai-vendor-governance-pack.js')
  const recs = await aiVendorGovernancePack.runRecommendations('TENANT-AI-TEST', {})
  assert.ok(Array.isArray(recs))
  assert.ok(recs.length > 0, 'Should generate seat reclaim recommendations for idle seats')
})

test('AI vendor governance pack supports rollback', async () => {
  const { aiVendorGovernancePack } = await import('../lib/packs/ai/ai-vendor-governance-pack.js')
  assert.equal(aiVendorGovernancePack.definition.supportsRollback, true)
})

test('AI agent runtime governance pack is registered', async () => {
  await import('../lib/packs/ai/ai-agent-runtime-governance-pack.js')
  const { globalPackRegistry } = await import('../lib/economic-operations-pack-registry.js')
  const pack = globalPackRegistry.get('ai-agent-runtime-governance')
  assert.ok(pack !== undefined)
  assert.equal(pack!.definition.category, 'AGENT_RUNTIME_GOVERNANCE')
})

test('AI context governance pack is registered', async () => {
  await import('../lib/packs/ai/ai-context-governance-pack.js')
  const { globalPackRegistry } = await import('../lib/economic-operations-pack-registry.js')
  const pack = globalPackRegistry.get('ai-context-governance')
  assert.ok(pack !== undefined)
  assert.equal(pack!.definition.category, 'CONTEXT_GOVERNANCE')
})

test('AI ROI governance pack is registered', async () => {
  await import('../lib/packs/ai/ai-roi-governance-pack.js')
  const { globalPackRegistry } = await import('../lib/economic-operations-pack-registry.js')
  const pack = globalPackRegistry.get('ai-roi-governance')
  assert.ok(pack !== undefined)
  assert.equal(pack!.definition.category, 'ROI_GOVERNANCE')
})

test('AI ROI pack evidence includes verifiedSavings and totalSpend', async () => {
  const { aiROIGovernancePack } = await import('../lib/packs/ai/ai-roi-governance-pack.js')
  const evidence = await aiROIGovernancePack.definition.evidenceLayer.collector.collect('TENANT-AI-TEST', {})
  const ev = evidence as { totalAISpendUSD: number; verifiedSavingsUSD: number }
  assert.ok(typeof ev.totalAISpendUSD === 'number')
  assert.ok(typeof ev.verifiedSavingsUSD === 'number')
})

test('AI drift governance pack is registered', async () => {
  await import('../lib/packs/ai/ai-drift-governance-pack.js')
  const { globalPackRegistry } = await import('../lib/economic-operations-pack-registry.js')
  const pack = globalPackRegistry.get('ai-drift-governance')
  assert.ok(pack !== undefined)
  assert.equal(pack!.definition.category, 'DRIFT_GOVERNANCE')
})

test('AI drift governance pack has 4+ drift detection rules', async () => {
  const { aiDriftGovernancePack } = await import('../lib/packs/ai/ai-drift-governance-pack.js')
  assert.ok((aiDriftGovernancePack.definition.driftLayer?.rules.length ?? 0) >= 4)
})

test('AI overlap elimination pack is registered', async () => {
  await import('../lib/packs/ai/ai-overlap-elimination-pack.js')
  const { globalPackRegistry } = await import('../lib/economic-operations-pack-registry.js')
  const pack = globalPackRegistry.get('ai-overlap-elimination')
  assert.ok(pack !== undefined)
  assert.equal(pack!.definition.category, 'OVERLAP_ELIMINATION')
})

test('AI overlap elimination pack detects Cursor+Windsurf overlap', async () => {
  const { aiOverlapEliminationPack } = await import('../lib/packs/ai/ai-overlap-elimination-pack.js')
  const recs = await aiOverlapEliminationPack.runRecommendations('TENANT-AI-TEST', {})
  assert.ok(Array.isArray(recs))
  // Should detect the coding assistant overlap
  const recTitles = recs.map((r: unknown) => JSON.stringify(r))
  const hasOverlap = recTitles.some((t) => t.toLowerCase().includes('overlap') || t.toLowerCase().includes('consolidat'))
  assert.ok(hasOverlap, 'Should generate consolidation recommendation for Cursor+Windsurf overlap')
})

test('M365 license reclaim pack is registered', async () => {
  await import('../lib/packs/m365/m365-license-reclaim-pack.js')
  const { globalPackRegistry } = await import('../lib/economic-operations-pack-registry.js')
  const pack = globalPackRegistry.get('m365-disabled-user-license-reclaim')
  assert.ok(pack !== undefined)
  assert.equal(pack!.definition.domain, 'M365')
  assert.equal(pack!.definition.category, 'LICENSE_RECLAIM')
})

test('M365 license reclaim pack requires dual approval', async () => {
  const { m365LicenseReclaimPack } = await import('../lib/packs/m365/m365-license-reclaim-pack.js')
  assert.equal(m365LicenseReclaimPack.definition.defaultApprovalPolicy, 'DUAL_APPROVAL')
})

test('M365 license reclaim pack supports rollback and verification', async () => {
  const { m365LicenseReclaimPack } = await import('../lib/packs/m365/m365-license-reclaim-pack.js')
  assert.equal(m365LicenseReclaimPack.definition.supportsRollback, true)
  assert.equal(m365LicenseReclaimPack.definition.supportsVerification, true)
  assert.equal(m365LicenseReclaimPack.definition.supportsDriftDetection, true)
})

test('M365 license reclaim pack generates recommendations for disabled users', async () => {
  const { m365LicenseReclaimPack } = await import('../lib/packs/m365/m365-license-reclaim-pack.js')
  const recs = await m365LicenseReclaimPack.runRecommendations('TENANT-AI-TEST', {})
  assert.ok(Array.isArray(recs))
  assert.ok(recs.length > 0, 'Should find disabled users with licenses in mock data')
})

// ---------------------------------------------------------------------------
// Cross-pack validation: all packs use the same spine
// ---------------------------------------------------------------------------

test('all registered packs inherit the same lifecycle interface', async () => {
  // Import all packs to trigger registration
  await Promise.all([
    import('../lib/packs/ai/ai-token-governance-pack.js'),
    import('../lib/packs/ai/ai-model-routing-pack.js'),
    import('../lib/packs/ai/ai-vendor-governance-pack.js'),
    import('../lib/packs/ai/ai-agent-runtime-governance-pack.js'),
    import('../lib/packs/ai/ai-context-governance-pack.js'),
    import('../lib/packs/ai/ai-roi-governance-pack.js'),
    import('../lib/packs/ai/ai-drift-governance-pack.js'),
    import('../lib/packs/ai/ai-overlap-elimination-pack.js'),
    import('../lib/packs/m365/m365-license-reclaim-pack.js'),
  ])

  const { globalPackRegistry } = await import('../lib/economic-operations-pack-registry.js')
  const allPacks = globalPackRegistry.list()

  for (const pack of allPacks) {
    assert.equal(typeof pack.runRecommendations, 'function', `${pack.packId}: missing runRecommendations`)
    assert.equal(typeof pack.runSimulation, 'function', `${pack.packId}: missing runSimulation`)
    assert.equal(typeof pack.checkReadiness, 'function', `${pack.packId}: missing checkReadiness`)
    assert.equal(typeof pack.runVerification, 'function', `${pack.packId}: missing runVerification`)
    assert.equal(typeof pack.detectDrift, 'function', `${pack.packId}: missing detectDrift`)
    assert.equal(typeof pack.getUXMetadata, 'function', `${pack.packId}: missing getUXMetadata`)
    assert.ok(pack.definition.id.length > 0, `${pack.packId}: definition.id is empty`)
    assert.ok(pack.definition.version.length > 0, `${pack.packId}: definition.version is empty`)
  }
})

test('globalPackRuntime can generate recommendations for any registered pack', async () => {
  await Promise.all([
    import('../lib/packs/ai/ai-token-governance-pack.js'),
    import('../lib/packs/ai/ai-vendor-governance-pack.js'),
    import('../lib/packs/m365/m365-license-reclaim-pack.js'),
  ])

  const { globalPackRuntime } = await import('../lib/economic-operations-pack-runtime.js')

  const tokenRecs = await globalPackRuntime.generateRecommendations('ai-token-governance', 'TENANT-RUNTIME-TEST', {})
  assert.ok(tokenRecs.length > 0)
  const firstRec = tokenRecs[0] as { packId: string }
  assert.equal(firstRec.packId, 'ai-token-governance')

  const vendorRecs = await globalPackRuntime.generateRecommendations('ai-vendor-seat-reclaim', 'TENANT-RUNTIME-TEST', {})
  assert.ok(vendorRecs.length > 0)

  const m365Recs = await globalPackRuntime.generateRecommendations('m365-disabled-user-license-reclaim', 'TENANT-RUNTIME-TEST', {})
  assert.ok(m365Recs.length > 0)
})
