import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFlexeraRecommendations } from '../lib/connectors/flexera/flexera-recommendation-generator';
import type { FlexeraDiscoveryResult } from '../lib/production-connectors/flexera/flexera-types';

function mk(partial: Partial<FlexeraDiscoveryResult>): FlexeraDiscoveryResult {
  return {
    runId: 'run1', tenantId: 't1', requestIds: [],
    applications: [], softwareAssets: [], vendors: [], contracts: [],
    entitlements: [], renewals: [], consumption: [], ownership: [],
    evidenceRefs: ['evidence:run1'],
    ...partial,
  };
}

test('detects unused license when consumption has zero active users', () => {
  const result = mk({
    entitlements: [{ id: 'e1', productId: 'p1', purchased: 10, assigned: 0, consumed: 0, available: 10 }],
    consumption: [{ id: 'c1', applicationId: 'p1', activeUsers: 0, assignedUsers: 0, utilisationPercent: 0 }],
  });
  const { recommendations } = generateFlexeraRecommendations(result);
  assert.equal(recommendations.some((r) => r.actionType === 'UNUSED_LICENSE'), true);
  assert.equal(recommendations.every((r) => r.executionReadiness === 'MANUAL_ONLY'), true);
});

test('detects underutilised license below threshold', () => {
  const result = mk({
    entitlements: [{ id: 'e1', productId: 'p1', purchased: 10, assigned: 5, consumed: 2, available: 5 }],
    consumption: [{ id: 'c1', applicationId: 'p1', activeUsers: 2, assignedUsers: 5, utilisationPercent: 20 }],
  });
  const { recommendations } = generateFlexeraRecommendations(result);
  assert.equal(recommendations.some((r) => r.actionType === 'UNDERUTILISED_LICENSE'), true);
});

test('detects duplicate capability when multiple applications share a name', () => {
  const result = mk({
    applications: [
      { id: 'a1', name: 'Acme Suite', vendor: 'Acme', owner: 'owner@x.com' },
      { id: 'a2', name: 'Acme Suite', vendor: 'Acme', owner: 'owner@x.com' },
    ],
  });
  const { recommendations } = generateFlexeraRecommendations(result);
  const dup = recommendations.filter((r) => r.actionType === 'DUPLICATE_CAPABILITY');
  assert.equal(dup.length, 2);
});

test('detects orphaned asset when application has no owner', () => {
  const result = mk({ applications: [{ id: 'a1', name: 'No Owner App', vendor: 'Acme' }] });
  const { recommendations } = generateFlexeraRecommendations(result);
  assert.equal(recommendations.some((r) => r.actionType === 'ORPHANED_ASSET' && r.targetEntityId === 'a1'), true);
});

test('detects renewal review required within the renewal window', () => {
  const soon = new Date(Date.now() + 30 * 86400000).toISOString();
  const far = new Date(Date.now() + 400 * 86400000).toISOString();
  const result = mk({
    renewals: [
      { id: 'r1', contractId: 'c1', renewalDate: soon },
      { id: 'r2', contractId: 'c2', renewalDate: far },
    ],
  });
  const { recommendations } = generateFlexeraRecommendations(result);
  const renewalRecs = recommendations.filter((r) => r.actionType === 'RENEWAL_REVIEW_REQUIRED');
  assert.equal(renewalRecs.length, 1);
  assert.equal(renewalRecs[0]?.targetEntityId, 'c1');
});

test('produces deterministic, deduplicated recommendation IDs', () => {
  const result = mk({ applications: [{ id: 'a1', name: 'No Owner App', vendor: 'Acme' }] });
  const first = generateFlexeraRecommendations(result);
  const second = generateFlexeraRecommendations(result);
  assert.deepEqual(first.recommendations.map((r) => r.recommendationId), second.recommendations.map((r) => r.recommendationId));
  const ids = first.recommendations.map((r) => r.recommendationId);
  assert.equal(new Set(ids).size, ids.length);
});

test('never produces an execution-eligible recommendation', () => {
  const result = mk({
    entitlements: [{ id: 'e1', productId: 'p1', purchased: 10, assigned: 0, consumed: 0, available: 10 }],
    consumption: [{ id: 'c1', applicationId: 'p1', activeUsers: 0, assignedUsers: 0, utilisationPercent: 0 }],
    applications: [{ id: 'a1', name: 'No Owner App', vendor: 'Acme' }],
    renewals: [{ id: 'r1', contractId: 'c1', renewalDate: new Date(Date.now() + 10 * 86400000).toISOString() }],
  });
  const { recommendations } = generateFlexeraRecommendations(result);
  assert.equal(recommendations.length > 0, true);
  for (const r of recommendations) {
    assert.equal(r.executionReadiness, 'MANUAL_ONLY');
    assert.notEqual(r.executionReadiness, 'AUTO_EXECUTE_ELIGIBLE');
  }
});
