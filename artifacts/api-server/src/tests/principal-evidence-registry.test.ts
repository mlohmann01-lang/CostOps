import test from 'node:test';
import assert from 'node:assert/strict';
import { inferPrincipalType } from '../lib/principal-authority-service';
import { EvidenceRegistryV2Service } from '../lib/evidence-registry-v2-service';

test('principal resolution helpers infer actor classes from raw identities', () => {
  assert.equal(inferPrincipalType({ email: 'alice@example.com' }), 'HUMAN');
  assert.equal(inferPrincipalType({ displayName: 'system' }), 'SYSTEM');
  assert.equal(inferPrincipalType({ email: 'svc-graph-connector@example.com' }), 'SERVICE_ACCOUNT');
  assert.equal(inferPrincipalType({ displayName: 'license-reclaim-automation' }), 'AUTOMATION');
  assert.equal(inferPrincipalType({ externalId: 'agent:costops' }), 'AGENT');
});

test('evidence hashing is deterministic across object key order', () => {
  const service = new EvidenceRegistryV2Service({} as any);
  assert.equal(service.hashEvidencePayload({ b: 2, a: { y: true, x: [3, 1] } }), service.hashEvidencePayload({ a: { x: [3, 1], y: true }, b: 2 }));
});

test('evidence summaries are stable and bounded', () => {
  const service = new EvidenceRegistryV2Service({} as any);
  assert.match(service.summarizeEvidence({ entity: 'execution', status: 'verified' }), /execution/);
  assert.ok(service.summarizeEvidence({ payload: 'x'.repeat(500) }).length <= 240);
});
