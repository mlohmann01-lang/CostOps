import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFlexeraRecommendations } from '../lib/connectors/flexera/flexera-recommendation-generator';
import { FlexeraConnectorTrustService, FLEXERA_CONNECTOR_TYPE } from '../lib/connectors/flexera/flexera-connector-trust-service';
import { buildFlexeraProofPackEvidence } from '../lib/connectors/flexera/flexera-proof-pack-evidence';
import { generateTrustFindings } from '../lib/trust/trust-findings-service';
import { ExecutiveProofPackRepository, ExecutiveProofPackService, createInMemoryExecutiveProofPackStores } from '../lib/executive-proof-packs';
import type { FlexeraDiscoveryResult } from '../lib/production-connectors/flexera/flexera-types';
import type { TrustRecommendation } from '../lib/trust/trust-types';

function mkDiscovery(partial: Partial<FlexeraDiscoveryResult>): FlexeraDiscoveryResult {
  return {
    runId: 'run-trust-1', tenantId: 't1', requestIds: [],
    applications: [], softwareAssets: [], vendors: [], contracts: [],
    entitlements: [], renewals: [], consumption: [], ownership: [],
    evidenceRefs: ['evidence:run-trust-1'],
    ...partial,
  };
}

test('Workstream 6: Flexera trust service computes a score from connector health, completeness and mapping confidence', () => {
  const trustService = new FlexeraConnectorTrustService();
  const discovery = mkDiscovery({
    applications: [
      { id: 'a1', name: 'App With Owner', vendor: 'Acme', owner: 'owner@x.com' },
      { id: 'a2', name: 'App Without Owner', vendor: 'Acme' },
    ],
    entitlements: [{ id: 'e1', productId: 'a1', purchased: 10, assigned: 5, consumed: 2, available: 5 }],
    contracts: [{ contractId: 'c1', vendorId: 'v1', name: 'Contract' }],
    consumption: [{ id: 'c1', applicationId: 'a1', activeUsers: 2, assignedUsers: 5, utilisationPercent: 20 }],
  });
  const evaluation = trustService.evaluateFlexeraReadPathTrust('t1', discovery, { lastSyncResult: 'SUCCESS' });
  assert.equal(evaluation.connectorType, FLEXERA_CONNECTOR_TYPE);
  assert.equal(evaluation.identityMatchScore, 50); // 1 of 2 applications has a resolved owner -> mapping confidence
  assert.equal(evaluation.completenessScore, 100); // all four discovery categories populated
  assert.ok(evaluation.trustScore > 0 && evaluation.trustScore <= 100);
  assert.ok(evaluation.warningFindings.includes('MISSING_OWNER'));
});

test('Workstream 6: degraded connector health lowers the Flexera trust score and trust band', () => {
  const trustService = new FlexeraConnectorTrustService();
  const discovery = mkDiscovery({ applications: [{ id: 'a1', name: 'App', vendor: 'Acme', owner: 'o@x.com' }] });
  const healthy = trustService.evaluateFlexeraReadPathTrust('t1', discovery, { lastSyncResult: 'SUCCESS' });
  const degraded = trustService.evaluateFlexeraReadPathTrust('t1', discovery, { lastSyncResult: 'AUTH_FAILED' });
  assert.ok(degraded.trustScore < healthy.trustScore);
  assert.equal(degraded.trustBand, 'QUARANTINED');
  assert.ok(degraded.criticalFindings.includes('CONNECTOR_DEGRADED'));
});

test('Workstream 6: generic generateTrustFindings produces findings for Flexera recommendations using the existing trust pipeline (no Flexera-specific logic required)', () => {
  const recommendations: TrustRecommendation[] = [
    {
      recommendationId: 'flexera-unused-license-a1',
      tenantId: 't1',
      connector: FLEXERA_CONNECTOR_TYPE,
      sourceSystem: FLEXERA_CONNECTOR_TYPE,
      executionReadiness: 'MANUAL_ONLY',
      blockedReasons: [],
      readinessReasons: ['MANUAL_ONLY_ACTION_POLICY'],
      evidencePointers: ['evidence:run-trust-1'],
      targetEntityId: 'a1',
    },
  ];
  const findings = generateTrustFindings({ tenantId: 't1', recommendations });
  assert.equal(Array.isArray(findings), true);
});

test('Workstream 7: Flexera recommendations map into the existing Executive Proof Pack evidence-binding shape with asset, owner, source, trust and manual-only status', async () => {
  const discovery = mkDiscovery({
    applications: [{ id: 'a1', name: 'No Owner App', vendor: 'Acme' }],
  });
  const { recommendations } = generateFlexeraRecommendations(discovery);
  assert.ok(recommendations.length > 0);

  const trustService = new FlexeraConnectorTrustService();
  const trustEvaluation = trustService.evaluateFlexeraReadPathTrust('t1', discovery, { lastSyncResult: 'SUCCESS' });

  const evidenceInputs = buildFlexeraProofPackEvidence(recommendations, trustEvaluation, { a1: undefined });
  assert.ok(evidenceInputs.length > 0);
  for (const input of evidenceInputs) {
    assert.equal(input.sourceSystem, 'FLEXERA');
    assert.equal(input.manualOnly, true);
    assert.equal(input.executionReadiness, 'MANUAL_ONLY');
    assert.equal(input.targetId, 'a1');
    assert.ok(input.evidenceRef.length > 0);
  }

  const svc = new ExecutiveProofPackService(new ExecutiveProofPackRepository(createInMemoryExecutiveProofPackStores()));
  const pack = await svc.buildProofPack('t1', 'CIO', {
    metrics: { financeVerifiedSavings: 0, executedSavings: 0, ownershipCompletenessScore: 50, confidenceScore: 60 },
    portfolioSnapshotId: 'ps',
    evidence: evidenceInputs,
  });
  const bindings = await svc.bindEvidenceToPack('t1', pack.id, evidenceInputs);
  assert.ok(bindings.length > 0);
  for (const binding of bindings) {
    assert.equal(binding.targetId, 'a1');
    assert.equal(binding.trustLevel, evidenceInputs[0]?.trustLevel);
  }
});

test('Sprint 4 guarantee: no Flexera recommendation, at any trust score or connector health state, is execution-eligible', () => {
  const discovery = mkDiscovery({
    entitlements: [{ id: 'e1', productId: 'p1', purchased: 10, assigned: 0, consumed: 0, available: 10 }],
    consumption: [{ id: 'c1', applicationId: 'p1', activeUsers: 0, assignedUsers: 0, utilisationPercent: 0 }],
    applications: [{ id: 'a1', name: 'No Owner App', vendor: 'Acme', owner: 'owner@x.com' }],
  });
  const { recommendations } = generateFlexeraRecommendations(discovery);
  const trustService = new FlexeraConnectorTrustService();
  const highTrust = trustService.evaluateFlexeraReadPathTrust('t1', discovery, { lastSyncResult: 'SUCCESS' });
  assert.ok(highTrust.trustScore > 0);
  for (const r of recommendations) {
    assert.equal(r.executionReadiness, 'MANUAL_ONLY');
    assert.notEqual(r.executionReadiness, 'AUTO_EXECUTE_ELIGIBLE');
  }
});
