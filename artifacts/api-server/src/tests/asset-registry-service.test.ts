import test from 'node:test'
import assert from 'node:assert/strict'
import { m365UsersTable } from '@workspace/db'
import { AssetRegistryService } from '../lib/assets/asset-registry-service'
import { ExecutionLifecycleAuthorityService } from '../lib/execution/execution-lifecycle-authority'

class FakePrincipals {
  principals = new Map<string, any>()
  events: any[] = []
  async resolvePrincipal(input: any) { const key = input.email ?? input.externalId ?? input.displayName; if (!key) return null; if (!this.principals.has(key)) this.principals.set(key, { id: `principal-${this.principals.size + 1}`, ...input }); return this.principals.get(key) }
  async getPrincipal(_tenantId: string, principalId: string) { return [...this.principals.values()].find((p) => p.id === principalId) ?? null }
  async recordActionEvent(input: any) { this.events.push(input); return input }
}

class FakeEvidence {
  items: any[] = []
  links: any[] = []
  async createEvidenceItem(input: any) { const row = { id: `evidence-${this.items.length + 1}`, ...input }; this.items.push(row); return row }
  async linkEvidenceToEntity(input: any) { const row = { id: `link-${this.links.length + 1}`, ...input }; this.links.push(row); return row }
}

test('asset creation, update and name normalization are idempotent', async () => {
  const service = new AssetRegistryService(new FakePrincipals() as any)
  const tenantId = 'asset-registry-core'
  assert.equal(service.normalizeAssetName('  Jane Doe / M365  '), 'jane-doe-m365')
  const first = await service.createOrUpdateAsset({ tenantId, assetType: 'USER', displayName: 'Jane Doe', primarySourceSystem: 'M365', primaryExternalId: 'user-1', metadata: { source: 'first' } })
  const second = await service.createOrUpdateAsset({ tenantId, assetType: 'USER', displayName: 'Jane Doe Renamed', primarySourceSystem: 'M365', primaryExternalId: 'user-1', metadata: { source: 'second' } })
  assert.equal(first.created, true)
  assert.equal(second.created, false)
  assert.equal(first.asset.id, second.asset.id)
  assert.equal((second.asset.metadata as any).source, 'second')
})



test('asset resolution by normalized name reuses canonical asset', async () => {
  const service = new AssetRegistryService(new FakePrincipals() as any)
  const tenantId = 'asset-registry-normalized'
  const first = await service.resolveAsset({ tenantId, assetType: 'APPLICATION', displayName: 'Finance Portal' })
  const second = await service.resolveAsset({ tenantId, assetType: 'APPLICATION', displayName: 'finance portal' })
  assert.equal(first?.asset?.id, second?.asset?.id)
})

test('source mappings resolve assets and remain idempotent', async () => {
  const service = new AssetRegistryService(new FakePrincipals() as any)
  const tenantId = 'asset-registry-mapping'
  const { asset } = await service.createOrUpdateAsset({ tenantId, assetType: 'USER', displayName: 'Mapping User', primarySourceSystem: 'M365', primaryExternalId: 'map-user-1' })
  const first = await service.createOrUpdateSourceMapping({ tenantId, assetId: asset.id, sourceSystem: 'M365', sourceEntityType: 'm365_users', sourceEntityId: '42', externalId: 'map-user-1', mappingMethod: 'DIRECT_ID' })
  const second = await service.createOrUpdateSourceMapping({ tenantId, assetId: asset.id, sourceSystem: 'M365', sourceEntityType: 'm365_users', sourceEntityId: '42', externalId: 'map-user-1', mappingMethod: 'DIRECT_ID' })
  const resolved = await service.getAssetBySource(tenantId, 'M365', 'm365_users', '42')
  assert.equal(first.created, true)
  assert.equal(second.created, false)
  assert.equal(resolved?.asset?.id, asset.id)
})

test('owner linking uses Principal Authority and supports multiple owners per asset', async () => {
  const principals = new FakePrincipals()
  const service = new AssetRegistryService(principals as any)
  const tenantId = 'asset-registry-owner'
  const { asset } = await service.createOrUpdateAsset({ tenantId, assetType: 'APPLICATION', displayName: 'Finance App' })
  await service.linkAssetToPrincipalOwner({ tenantId, assetId: asset.id, ownershipType: 'BUSINESS_OWNER', email: 'biz@example.com', sourceSystem: 'SERVICENOW', rawOwner: { owner: 'Biz' } })
  await service.linkAssetToPrincipalOwner({ tenantId, assetId: asset.id, ownershipType: 'TECHNICAL_OWNER', email: 'tech@example.com', sourceSystem: 'SERVICENOW', rawOwner: { owner: 'Tech' } })
  const owners = await service.getOwnersForAsset(tenantId, asset.id)
  assert.equal(owners.length, 2)
  assert.equal(principals.events.length, 2)
  assert.ok(owners.some((o: any) => o.ownershipType === 'BUSINESS_OWNER'))
  assert.ok(owners.some((o: any) => o.ownershipType === 'TECHNICAL_OWNER'))
})

test('M365 backfill uses persisted rows only and is idempotent', async () => {
  const service = new AssetRegistryService(new FakePrincipals() as any)
  ;(service as any).readRows = async (table: any) => table === m365UsersTable ? [{ id: 1, tenantId: 'asset-registry-backfill', sourceObjectId: 'm365-user-1', userPrincipalName: 'm365.user@example.com', displayName: 'M365 User', accountEnabled: 'true', assignedLicenses: ['sku-e3'] }] : []
  const first = await service.backfillM365('asset-registry-backfill')
  const second = await service.backfillM365('asset-registry-backfill')
  assert.equal(first.created, 2)
  assert.equal(first.mapped, 2)
  assert.equal(second.created, 0)
  assert.equal(second.updated, 2)
  assert.equal(second.mapped, 0)
})

test('lifecycle authority attaches canonical asset context and links evidence to ASSET', async () => {
  const principals = new FakePrincipals()
  const evidence = new FakeEvidence()
  const assets = new AssetRegistryService(principals as any)
  const authority = new ExecutionLifecycleAuthorityService(principals as any, evidence as any, assets)
  const result = await authority.recordStage({ tenantId: 'asset-registry-lifecycle', entityType: 'EXECUTION_REQUEST', entityId: 'exec-asset-1', stage: 'EXECUTION_REQUEST_CREATED', role: 'REQUESTER', actorId: 'requester@example.com', sourceSystem: 'M365', payload: { request: { targetEntityId: 'm365-user-99' }, userPrincipalName: 'asset.user@example.com' } })
  assert.ok(result.asset?.id)
  assert.equal(evidence.items[0].payload.canonicalAsset.assetId, result.asset?.id)
  assert.ok(result.assetEvidenceLink)
})
