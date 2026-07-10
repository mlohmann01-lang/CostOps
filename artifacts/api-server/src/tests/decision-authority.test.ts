import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryDecisionAuthorityStores } from '../lib/decision-authority/decision-authority-repository';
import { DecisionAuthorityRepository } from '../lib/decision-authority/decision-authority-repository';
import { DecisionAuthorityService } from '../lib/decision-authority/decision-authority-service';
import { DecisionLifecycleBridge } from '../lib/decision-authority/decision-lifecycle-bridge';

const makeService = () => new DecisionAuthorityService(new DecisionAuthorityRepository(createInMemoryDecisionAuthorityStores()));

test('decision creation captures core fields and defaults to PROPOSED', async () => {
  const s = makeService();
  const d = await s.createDecision({ tenantId: 't1', decisionType: 'MANUAL_DECISION', title: 'Test decision', rationale: ['because reasons'], sourceSystem: 'TEST', sourceReference: 'ref-1' });
  assert.equal(d.status, 'PROPOSED');
  assert.equal(d.title, 'Test decision');
  assert.ok(d.id);
});

test('evidence linkage attaches evidence to a decision', async () => {
  const s = makeService();
  const d = await s.createDecision({ tenantId: 't1', decisionType: 'MANUAL_DECISION', title: 'Decision', rationale: [], sourceSystem: 'TEST', sourceReference: 'ref-2' });
  const link = await s.attachEvidence('t1', d.id, 'evidence-1', 'SUPPORTING');
  assert.equal(link.decisionId, d.id);
  assert.equal(link.evidenceItemId, 'evidence-1');
});

test('asset linkage attaches an asset to a decision', async () => {
  const s = makeService();
  const d = await s.createDecision({ tenantId: 't1', decisionType: 'MANUAL_DECISION', title: 'Decision', rationale: [], sourceSystem: 'TEST', sourceReference: 'ref-3' });
  const link = await s.attachAsset('t1', d.id, 'asset-1', 'PRIMARY');
  assert.equal(link.assetId, 'asset-1');
  assert.equal(link.relationshipType, 'PRIMARY');
});

test('principal linkage attaches a principal to a decision', async () => {
  const s = makeService();
  const d = await s.createDecision({ tenantId: 't1', decisionType: 'MANUAL_DECISION', title: 'Decision', rationale: [], sourceSystem: 'TEST', sourceReference: 'ref-4' });
  const link = await s.attachPrincipal('t1', d.id, 'user-1', 'APPROVER');
  assert.equal(link.principalId, 'user-1');
  assert.equal(link.role, 'APPROVER');
});

test('trust snapshot is captured at creation and never rewritten by later transitions', async () => {
  const s = makeService();
  const trustSnapshot = { trustScore: 91, trustLevel: 'HIGH', trustSource: 'connector-trust', capturedAt: '2026-01-01T00:00:00.000Z' };
  const d = await s.createDecision({ tenantId: 't1', decisionType: 'EXECUTION_APPROVAL', title: 'Decision', rationale: [], sourceSystem: 'TEST', sourceReference: 'ref-5', trustSnapshot });
  const approved = await s.approveDecision('t1', d.id);
  const executed = await s.markExecuted('t1', d.id);
  assert.deepEqual(approved.trustSnapshot, trustSnapshot);
  assert.deepEqual(executed.trustSnapshot, trustSnapshot);
});

test('recommendation approval creates a decision automatically via the lifecycle bridge', async () => {
  const service = makeService();
  const bridge = new DecisionLifecycleBridge(service);
  const decision = await bridge.recordExecutionApproval({ tenantId: 't1', recommendationId: 'rec-1', actorId: 'approver@example.com', targetEntityId: 'asset-1', evidencePointers: ['evidence-1', 'evidence-2'] });
  assert.equal(decision.decisionType, 'EXECUTION_APPROVAL');
  assert.equal(decision.sourceReference, 'rec-1');
  assert.equal(decision.status, 'EXECUTED');
  const again = await bridge.recordExecutionApproval({ tenantId: 't1', recommendationId: 'rec-1', actorId: 'approver@example.com' });
  assert.equal(again.id, decision.id, 'must not duplicate decisions for the same recommendation');
});

test('decision links to execution via markExecuted after approval', async () => {
  const s = makeService();
  const d = await s.createDecision({ tenantId: 't1', decisionType: 'EXECUTION_APPROVAL', title: 'Decision', rationale: [], sourceSystem: 'TEST', sourceReference: 'ref-6' });
  await s.approveDecision('t1', d.id);
  const executed = await s.markExecuted('t1', d.id);
  assert.equal(executed.status, 'EXECUTED');
  assert.ok(executed.executedAt);
  await assert.rejects(() => s.markExecuted('t1', d.id), /cannot transition/);
});

test('decision links to a verified outcome via the lifecycle bridge', async () => {
  const service = makeService();
  const bridge = new DecisionLifecycleBridge(service);
  const decision = await bridge.recordExecutionApproval({ tenantId: 't1', recommendationId: 'rec-2', actorId: 'approver@example.com' });
  const verified = await bridge.recordOutcomeVerification({ tenantId: 't1', recommendationId: 'rec-2', outcomeId: 'outcome-1', verified: true });
  assert.equal(verified?.status, 'VERIFIED');
  const lineage = await service.getDecisionLineage('t1', decision.id);
  assert.ok(lineage.outcomes.some((o) => o.outcomeId === 'outcome-1' && o.relationshipType === 'VERIFIED'));
});

test('decision links to a protected outcome via the lifecycle bridge', async () => {
  const service = makeService();
  const bridge = new DecisionLifecycleBridge(service);
  const decision = await bridge.recordExecutionApproval({ tenantId: 't1', recommendationId: 'rec-3', actorId: 'approver@example.com' });
  await bridge.recordOutcomeVerification({ tenantId: 't1', recommendationId: 'rec-3', outcomeId: 'outcome-2', verified: true });
  const protected_ = await bridge.recordOutcomeProtection({ tenantId: 't1', recommendationId: 'rec-3', outcomeId: 'outcome-2' });
  assert.equal(protected_?.status, 'PROTECTED');
  assert.ok(protected_?.protectedAt);
  const lineage = await service.getDecisionLineage('t1', decision.id);
  assert.ok(lineage.outcomes.some((o) => o.relationshipType === 'PROTECTED'));
});

test('decision lineage reconstructs full Assets/Principals/Evidence/Outcomes context', async () => {
  const s = makeService();
  const d = await s.createDecision({ tenantId: 't1', decisionType: 'MANUAL_DECISION', title: 'Decision', rationale: ['x'], sourceSystem: 'TEST', sourceReference: 'ref-7' });
  await s.attachAsset('t1', d.id, 'asset-1', 'PRIMARY');
  await s.attachPrincipal('t1', d.id, 'user-1', 'OWNER');
  await s.attachEvidence('t1', d.id, 'evidence-1', 'SUPPORTING');
  await s.attachOutcome('t1', d.id, 'outcome-1', 'EXPECTED');
  const lineage = await s.getDecisionLineage('t1', d.id);
  assert.equal(lineage.decision.id, d.id);
  assert.equal(lineage.assets.length, 1);
  assert.equal(lineage.principals.length, 1);
  assert.equal(lineage.evidence.length, 1);
  assert.equal(lineage.outcomes.length, 1);
});
