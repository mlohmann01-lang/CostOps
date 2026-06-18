import test from 'node:test'
import assert from 'node:assert/strict'
import { ExecutionLifecycleAuthorityService } from '../lib/execution/execution-lifecycle-authority'

class InMemoryPrincipals {
  principals = new Map<string, any>()
  actions: any[] = []
  async resolvePrincipal(input: any) {
    const key = `${input.tenantId}:${input.email ?? input.externalId ?? input.displayName}`
    if (!this.principals.has(key)) this.principals.set(key, { id: `principal-${this.principals.size + 1}`, ...input })
    return this.principals.get(key)
  }
  async recordActionEvent(input: any) { const row = { id: `pae-${this.actions.length + 1}`, ...input }; this.actions.push(row); return row }
}

class InMemoryEvidence {
  items: any[] = []
  links: any[] = []
  async createEvidenceItem(input: any) { const row = { id: `evidence-${this.items.length + 1}`, ...input }; this.items.push(row); return row }
  async linkEvidenceToEntity(input: any) { const row = { id: `evlink-${this.links.length + 1}`, ...input }; this.links.push(row); return row }
}

class InMemoryAssets {
  links: any[] = []
  async resolveAsset(input: any) { return { asset: { id: `asset-${input.sourceEntityId}`, assetType: input.assetType ?? 'UNKNOWN', displayName: input.displayName ?? input.sourceEntityId }, mapping: { id: `mapping-${input.sourceEntityId}` } } }
  async linkEvidenceToAsset(input: any) { const row = { id: `asset-link-${this.links.length + 1}`, ...input }; this.links.push(row); return row }
}

test('full M365 governed execution lifecycle records principal events and evidence links at each stage', async () => {
  const principals = new InMemoryPrincipals()
  const evidence = new InMemoryEvidence()
  const authority = new ExecutionLifecycleAuthorityService(principals as any, evidence as any, new InMemoryAssets() as any)
  const tenantId = 'tenant-m365-lifecycle'
  const executionRequestId = 'm365-exec-1001'
  const outcomeLedgerId = 'ledger-1001'

  const stages = [
    { entityType: 'EXECUTION_REQUEST', entityId: executionRequestId, stage: 'EXECUTION_REQUEST_CREATED', role: 'REQUESTER', actorId: 'requester@example.com', payload: { rawEvidencePointers: ['m365:user:u1'] } },
    { entityType: 'M365_EXECUTION', entityId: executionRequestId, stage: 'M365_EXECUTION_EVIDENCE_CAPTURED', role: 'EXECUTOR', actorId: 'operator@example.com', payload: { rawExecutionEvidence: [{ graphRequestId: 'graph-1' }] }, sourceSystem: 'M365' },
    { entityType: 'EXECUTION_RESULT', entityId: 'execres-1001', stage: 'EXECUTION_EXECUTED', role: 'EXECUTOR', actorId: 'operator@example.com', payload: { rawExecutionEvidence: [{ graphRequestId: 'graph-1' }] } },
    { entityType: 'OUTCOME_LEDGER', entityId: outcomeLedgerId, stage: 'OUTCOME_LEDGER_EXECUTION_UPDATED', role: 'EXECUTOR', actorId: 'operator@example.com', payload: { rawOutcomeEvidence: { original: true } } },
    { entityType: 'OUTCOME_VERIFICATION', entityId: executionRequestId, stage: 'OUTCOME_VERIFICATION_VERIFIED', role: 'VERIFIER', actorId: 'verifier@example.com', payload: { verificationEvidence: { assignedSkuIds: [] } }, sourceSystem: 'M365' },
    { entityType: 'DRIFT_EVENT', entityId: executionRequestId, stage: 'DRIFT_EVENT_DETECTED', role: 'SYSTEM', actorId: 'system', payload: { verificationEvidence: { reassignedSkuIds: ['sku-a'] } }, sourceSystem: 'M365' },
    { entityType: 'PROOF_PACK', entityId: executionRequestId, stage: 'PROOF_PACK_GENERATED', role: 'AUDITOR', actorId: 'auditor@example.com', payload: { nodes: [{ proofId: 'readiness-proof-1001' }] } },
  ]

  for (const stage of stages) await authority.recordStage({ tenantId, relationshipType: 'PROVES', sourceEntityType: stage.entityType.toLowerCase(), sourceEntityId: stage.entityId, ...stage })

  assert.equal(principals.actions.length, stages.length)
  assert.equal(evidence.items.length, stages.length)
  assert.equal(evidence.links.length, stages.length)
  for (const stage of stages) {
    assert.ok(principals.actions.some((event) => event.actionContextType === stage.entityType && event.actionContextId === stage.entityId && event.metadata.stage === stage.stage), `${stage.stage} principal event missing`)
    assert.ok(evidence.links.some((link) => link.linkedEntityType === stage.entityType && link.linkedEntityId === stage.entityId), `${stage.stage} evidence link missing`)
    assert.ok(evidence.items.some((item) => item.evidenceType === stage.stage), `${stage.stage} evidence item missing`)
  }
})
