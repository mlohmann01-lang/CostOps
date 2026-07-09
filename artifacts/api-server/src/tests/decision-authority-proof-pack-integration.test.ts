import test from 'node:test';
import assert from 'node:assert/strict';
import { DecisionAuthorityService } from '../lib/decision-authority/decision-authority-service';
import { DecisionAuthorityRepository, createInMemoryDecisionAuthorityStores } from '../lib/decision-authority/decision-authority-repository';
import { ExecutiveProofPackRepository, ExecutiveProofPackService, createInMemoryExecutiveProofPackStores } from '../lib/executive-proof-packs';

test('Workstream 8: Decision Authority lineage is wired into Executive Proof Packs via the existing metrics/evidence seam', async () => {
  const decisionAuthorityService = new DecisionAuthorityService(new DecisionAuthorityRepository(createInMemoryDecisionAuthorityStores()));
  const tenantId = 'decision-proof-pack-tenant';
  const trustSnapshot = { trustScore: 92, trustLevel: 'CERTIFIED', trustSource: 'connector-trust', capturedAt: '2026-01-01T00:00:00.000Z' };
  const decision = await decisionAuthorityService.createDecision({
    tenantId,
    decisionType: 'EXECUTION_APPROVAL',
    title: 'Decommission idle VM',
    rationale: ['utilisation remained below threshold for 90 days', 'trust score exceeded threshold'],
    sourceSystem: 'RECOMMENDATION_APPROVAL',
    sourceReference: 'rec-proof-pack-1',
    primaryAssetId: 'asset-1',
    trustSnapshot,
  });
  await decisionAuthorityService.approveDecision(tenantId, decision.id, 'approver-1');
  await decisionAuthorityService.markExecuted(tenantId, decision.id);
  await decisionAuthorityService.attachPrincipal(tenantId, decision.id, 'approver-1', 'APPROVER');
  await decisionAuthorityService.attachPrincipal(tenantId, decision.id, 'requester-1', 'REQUESTER');
  await decisionAuthorityService.attachAsset(tenantId, decision.id, 'asset-1', 'PRIMARY');
  await decisionAuthorityService.attachEvidence(tenantId, decision.id, 'evidence-1', 'SUPPORTING');
  await decisionAuthorityService.attachOutcome(tenantId, decision.id, 'outcome-1', 'EXPECTED');
  await decisionAuthorityService.attachOutcome(tenantId, decision.id, 'outcome-2', 'VERIFIED');

  const svc = new ExecutiveProofPackService(
    new ExecutiveProofPackRepository(createInMemoryExecutiveProofPackStores()),
    undefined,
    { decisionAuthorityService },
  );
  const pack = await svc.buildProofPack(tenantId, 'CIO', {
    metrics: { financeVerifiedSavings: 100, executedSavings: 90, ownershipCompletenessScore: 80 },
    portfolioSnapshotId: 'ps',
  });

  const decisionSummary = (pack.metrics as any).decisionSummary as any[];
  assert.ok(Array.isArray(decisionSummary) && decisionSummary.length === 1, 'decision summary must appear in proof pack metrics');
  const entry = decisionSummary[0];
  assert.equal(entry.decisionId, decision.id);
  assert.equal(entry.status, 'EXECUTED');
  assert.deepEqual(entry.rationale, ['utilisation remained below threshold for 90 days', 'trust score exceeded threshold']);
  assert.deepEqual(entry.trustSnapshot, trustSnapshot);
  assert.deepEqual(
    entry.principalChain.sort((a: any, b: any) => a.role.localeCompare(b.role)),
    [{ principalId: 'approver-1', role: 'APPROVER' }, { principalId: 'requester-1', role: 'REQUESTER' }],
  );
  assert.deepEqual(entry.assetContext, [{ assetId: 'asset-1', relationshipType: 'PRIMARY' }]);
  assert.deepEqual(entry.evidenceRefs, ['evidence-1']);
  assert.deepEqual(entry.linkedOutcome, { outcomeId: 'outcome-2', relationshipType: 'VERIFIED' });

  const bindings = await svc.repo.listEvidenceBindings(tenantId, { packId: pack.id });
  const decisionBinding = bindings.find((b) => b.evidenceRef === 'evidence-1');
  assert.ok(decisionBinding, 'decision evidence must be bound to the proof pack');
  assert.equal(decisionBinding!.targetId, 'asset-1');
  assert.equal(decisionBinding!.trustLevel, 'CERTIFIED');
});
