import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryValueRealisationStores, ValueRealisationRepository } from '../lib/value-realisation/value-realisation-repository';
import { ValueRealisationAuthorityService } from '../lib/value-realisation/value-realisation-service';

const makeService = () => new ValueRealisationAuthorityService(new ValueRealisationRepository(createInMemoryValueRealisationStores()));

test('investment creation captures core fields and defaults to PROPOSED', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'GitHub Copilot', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'inv-1', expectedValueAmount: 1000 });
  assert.equal(inv.status, 'PROPOSED');
  assert.equal(inv.name, 'GitHub Copilot');
  assert.equal(inv.normalizedName, 'github-copilot');
  assert.ok(inv.id);
});

test('business capability creation', async () => {
  const s = makeService();
  const cap = await s.createOrUpdateBusinessCapability({ tenantId: 't1', name: 'Engineering Productivity', capabilityType: 'TECHNOLOGY' });
  assert.equal(cap.capabilityType, 'TECHNOLOGY');
  assert.equal(cap.normalizedName, 'engineering-productivity');
});

test('investment-to-capability linking', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r1' });
  const cap = await s.createOrUpdateBusinessCapability({ tenantId: 't1', name: 'Cap', capabilityType: 'AI' });
  const link = await s.linkInvestmentToCapability('t1', inv.id, cap.id, 'SUPPORTS');
  assert.equal(link.investmentId, inv.id);
  assert.equal(link.capabilityId, cap.id);
  assert.equal(link.relationshipType, 'SUPPORTS');
});

test('investment-to-asset linking', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r2' });
  const link = await s.linkInvestmentToAsset('t1', inv.id, 'asset-1', 'USES');
  assert.equal(link.assetId, 'asset-1');
  assert.equal(link.relationshipType, 'USES');
});

test('value signal creation', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r3' });
  const signal = await s.createValueSignal({ tenantId: 't1', investmentId: inv.id, signalType: 'TIME_SAVED', signalName: 'Hours saved/week', signalDirection: 'INCREASE_IS_GOOD', currentValue: 5 });
  assert.equal(signal.signalType, 'TIME_SAVED');
  assert.equal(signal.investmentId, inv.id);
});

test('value attribution creation', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r4' });
  const attribution = await s.createValueAttribution({ tenantId: 't1', investmentId: inv.id, attributionType: 'VERIFIED', attributedValueAmount: 5000, attributionMethod: 'EVIDENCE_BASED' });
  assert.equal(attribution.attributionType, 'VERIFIED');
  assert.equal(attribution.attributedValueAmount, 5000);
});

test('deterministic value evaluation aggregates attributions by type', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r5', expectedValueAmount: 1000 });
  await s.createValueAttribution({ tenantId: 't1', investmentId: inv.id, attributionType: 'PROJECTED', attributedValueAmount: 1000, attributionMethod: 'MANUAL' });
  await s.createValueAttribution({ tenantId: 't1', investmentId: inv.id, attributionType: 'VERIFIED', attributedValueAmount: 1200, attributionMethod: 'VERIFIED_SAVINGS', evidenceItemId: 'evidence-1' });
  const evaluation = await s.evaluateInvestmentValue('t1', inv.id);
  assert.equal(evaluation.totalProjectedValue, 1000);
  assert.equal(evaluation.totalVerifiedValue, 1200);
  assert.equal(evaluation.evidenceCount, 1);
});

test('insufficient evidence verdict when no evidence or outcomes exist', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r6', expectedValueAmount: 1000 });
  const evaluation = await s.evaluateInvestmentValue('t1', inv.id);
  assert.equal(evaluation.verdict, 'INSUFFICIENT_EVIDENCE');
});

test('partial value confirmed verdict when verified value is positive but below expected', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r7', expectedValueAmount: 1000 });
  await s.createValueAttribution({ tenantId: 't1', investmentId: inv.id, attributionType: 'VERIFIED', attributedValueAmount: 400, attributionMethod: 'EVIDENCE_BASED', evidenceItemId: 'evidence-2' });
  const evaluation = await s.evaluateInvestmentValue('t1', inv.id);
  assert.equal(evaluation.verdict, 'PARTIAL_VALUE_CONFIRMED');
});

test('value confirmed verdict when verified value meets or exceeds expected value', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r8', expectedValueAmount: 1000 });
  await s.createValueAttribution({ tenantId: 't1', investmentId: inv.id, attributionType: 'VERIFIED', attributedValueAmount: 1500, attributionMethod: 'VERIFIED_SAVINGS', evidenceItemId: 'evidence-3' });
  const evaluation = await s.evaluateInvestmentValue('t1', inv.id);
  assert.equal(evaluation.verdict, 'VALUE_CONFIRMED');
});

test('protected value uplifts confidence', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r9', expectedValueAmount: 1000 });
  await s.createValueAttribution({ tenantId: 't1', investmentId: inv.id, attributionType: 'VERIFIED', attributedValueAmount: 400, attributionMethod: 'EVIDENCE_BASED', evidenceItemId: 'evidence-4' });
  const withoutProtection = await s.evaluateInvestmentValue('t1', inv.id);
  await s.createValueAttribution({ tenantId: 't1', investmentId: inv.id, attributionType: 'PROTECTED', attributedValueAmount: 400, attributionMethod: 'EVIDENCE_BASED', evidenceItemId: 'evidence-5' });
  const withProtection = await s.evaluateInvestmentValue('t1', inv.id);
  assert.ok(withProtection.confidence > withoutProtection.confidence);
});

test('outcome-to-investment attribution via direct investmentId in outcome metadata', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r10' });
  const attribution = await s.attributeOutcomeToInvestment('t1', { id: 'outcome-1', metadata: { investmentId: inv.id }, verifiedMonthlySavings: 100 });
  assert.ok(attribution);
  assert.equal(attribution!.investmentId, inv.id);
  assert.equal(attribution!.attributionMethod, 'OUTCOME_LEDGER');
  assert.equal(attribution!.attributedValueAmount, 1200);
});

test('outcome-to-investment attribution via linked asset', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r11' });
  await s.linkInvestmentToAsset('t1', inv.id, 'asset-1', 'USES');
  const attribution = await s.attributeOutcomeToInvestment('t1', { id: 'outcome-2', targetEntityId: 'asset-1', annualisedSaving: 500 });
  assert.ok(attribution);
  assert.equal(attribution!.investmentId, inv.id);
});

test('outcome-to-investment attribution is not forced when confidence is weak', async () => {
  const s = makeService();
  const attribution = await s.attributeOutcomeToInvestment('t1', { id: 'outcome-3' });
  assert.equal(attribution, undefined);
});

test('decision-to-investment linkage', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r12' });
  await s.attachDecisionToInvestment('t1', inv.id, 'decision-1');
  const decisions = await s.getDecisionsForInvestment('t1', inv.id);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].decisionId, 'decision-1');
  await s.attachDecisionToInvestment('t1', inv.id, 'decision-1');
  const again = await s.getDecisionsForInvestment('t1', inv.id);
  assert.equal(again.length, 1, 'must not duplicate the same decision link');
});

test('AI investment record can be created and evaluated without live telemetry', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Microsoft Copilot', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'copilot-1', expectedValueAmount: 2000, valueHypothesis: 'Reduce drafting time for knowledge workers' });
  await s.createValueSignal({ tenantId: 't1', investmentId: inv.id, signalType: 'TIME_SAVED', signalName: 'Hours saved/month', signalDirection: 'INCREASE_IS_GOOD', currentValue: 20, sourceSystem: 'MANUAL' });
  await s.createValueAttribution({ tenantId: 't1', investmentId: inv.id, attributionType: 'VERIFIED', attributedValueAmount: 2200, attributionMethod: 'MANUAL', evidenceItemId: 'evidence-copilot-1' });
  const evaluation = await s.evaluateInvestmentValue('t1', inv.id);
  assert.equal(evaluation.verdict, 'VALUE_CONFIRMED');
  assert.equal(inv.investmentType, 'AI');
});

test('investment lineage reconstructs capabilities/assets/decisions/signals/attributions', async () => {
  const s = makeService();
  const inv = await s.createInvestment({ tenantId: 't1', name: 'Inv', investmentType: 'AI', sourceSystem: 'MANUAL', sourceReference: 'r13' });
  const cap = await s.createOrUpdateBusinessCapability({ tenantId: 't1', name: 'Cap', capabilityType: 'AI' });
  await s.linkInvestmentToCapability('t1', inv.id, cap.id, 'SUPPORTS');
  await s.linkInvestmentToAsset('t1', inv.id, 'asset-1', 'USES');
  await s.attachDecisionToInvestment('t1', inv.id, 'decision-1');
  await s.createValueSignal({ tenantId: 't1', investmentId: inv.id, signalType: 'COST_SAVING', signalName: 'Savings', signalDirection: 'INCREASE_IS_GOOD' });
  await s.createValueAttribution({ tenantId: 't1', investmentId: inv.id, attributionType: 'VERIFIED', attributedValueAmount: 100, attributionMethod: 'MANUAL' });
  const lineage = await s.getInvestmentLineage('t1', inv.id);
  assert.equal(lineage.capabilities.length, 1);
  assert.equal(lineage.assets.length, 1);
  assert.equal(lineage.decisions.length, 1);
  assert.equal(lineage.signals.length, 1);
  assert.equal(lineage.attributions.length, 1);
});
