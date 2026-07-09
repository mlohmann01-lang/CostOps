import test from 'node:test';
import assert from 'node:assert/strict';
import { ValueRealisationAuthorityService } from '../lib/value-realisation/value-realisation-service';
import { ValueRealisationRepository, createInMemoryValueRealisationStores } from '../lib/value-realisation/value-realisation-repository';
import { ExecutiveProofPackRepository, ExecutiveProofPackService, createInMemoryExecutiveProofPackStores } from '../lib/executive-proof-packs';

test('Value Realisation Authority summary is wired into Executive Proof Packs via the existing metrics/evidence seam', async () => {
  const valueRealisationAuthorityService = new ValueRealisationAuthorityService(new ValueRealisationRepository(createInMemoryValueRealisationStores()));
  const tenantId = 'value-realisation-proof-pack-tenant';

  const investment = await valueRealisationAuthorityService.createInvestment({
    tenantId,
    name: 'GitHub Copilot',
    investmentType: 'AI',
    sourceSystem: 'MANUAL',
    sourceReference: 'inv-proof-pack-1',
    expectedValueAmount: 1000,
    valueHypothesis: 'Reduce engineering cycle time',
  });
  await valueRealisationAuthorityService.attachDecisionToInvestment(tenantId, investment.id, 'decision-1');
  await valueRealisationAuthorityService.createValueAttribution({
    tenantId,
    investmentId: investment.id,
    outcomeId: 'outcome-1',
    attributionType: 'VERIFIED',
    attributedValueAmount: 1200,
    attributionMethod: 'EVIDENCE_BASED',
    evidenceItemId: 'evidence-vr-1',
    attributionConfidence: 0.9,
  });

  const svc = new ExecutiveProofPackService(
    new ExecutiveProofPackRepository(createInMemoryExecutiveProofPackStores()),
    undefined,
    { valueRealisationAuthorityService },
  );
  const pack = await svc.buildProofPack(tenantId, 'CIO', {
    metrics: { financeVerifiedSavings: 100, executedSavings: 90, ownershipCompletenessScore: 80 },
    portfolioSnapshotId: 'ps',
  });

  const valueRealisationSummary = (pack.metrics as any).valueRealisationSummary as any[];
  assert.ok(Array.isArray(valueRealisationSummary) && valueRealisationSummary.length === 1, 'value realisation summary must appear in proof pack metrics');
  const entry = valueRealisationSummary[0];
  assert.equal(entry.investmentId, investment.id);
  assert.equal(entry.investmentName, 'GitHub Copilot');
  assert.equal(entry.verdict, 'VALUE_CONFIRMED');
  assert.deepEqual(entry.linkedDecisionIds, ['decision-1']);
  assert.deepEqual(entry.linkedOutcomeIds, ['outcome-1']);
  assert.deepEqual(entry.evidenceRefs, ['evidence-vr-1']);

  const bindings = await svc.repo.listEvidenceBindings(tenantId, { packId: pack.id });
  const valueBinding = bindings.find((b) => b.evidenceRef === 'evidence-vr-1');
  assert.ok(valueBinding, 'value realisation evidence must be bound to the proof pack');
});
