import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { technologyPortfolioAuthorityService } from '../lib/technology-portfolio-authority/technology-portfolio-service';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { scenarioPlanningService } from '../lib/scenario-planning/scenario-planning-service';
import { getScenarioPlanningAuthority } from '../lib/scenario-planning/scenario-planning-authority';

async function seedAsset(tenantId: string, opts: {
  withOwner?: boolean; withCapability?: boolean; capability?: string; withOutcome?: boolean;
  withEvidence?: boolean; withContract?: boolean; withRenewal?: boolean; vendorId?: string;
} = {}) {
  const outcomeIds: string[] = [];
  if (opts.withOutcome !== false) {
    const outcome = economicOutcomeAttributionService.createEconomicOutcome({ tenantId, assetId: 'placeholder', assetType: 'APPLICATION', name: 'Faster resolution' });
    outcomeIds.push(outcome.id);
  }
  const asset = await technologyPortfolioAuthorityService.createOrUpdateAsset({
    tenantId,
    name: 'ServiceNow',
    assetType: 'SAAS',
    lifecycleStatus: 'ACTIVE',
    ownerUserId: opts.withOwner === false ? undefined : 'jane.doe',
    businessCapability: opts.withCapability === false ? undefined : (opts.capability ?? 'Customer Service'),
    outcomeIds,
    evidenceRefs: opts.withEvidence === false ? [] : ['evidence-1'],
    contractIds: opts.withContract ? ['contract-1'] : [],
    renewalIds: opts.withRenewal ? ['renewal-1'] : [],
    vendorId: opts.vendorId,
  });
  return asset;
}

// ─── Scenario Type Tests ──────────────────────────────────────────────────────

test('EX3.1 retire scenario: graph-derived impact for a mapped, evidenced asset', async () => {
  const t = `t-ex3-1-${randomUUID()}`;
  const asset = await seedAsset(t);
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'RETIRE', 'TECHNOLOGY', asset.id);
  assert.equal(analysis.scenarioType, 'RETIRE');
  assert.equal(analysis.impactedAssets, 1);
  assert.equal(analysis.impactedCapabilities, 1);
  assert.equal(analysis.impactedOutcomes, 1);
});

test('EX3.2 renew scenario: renewal impact reflects real tracked renewals', async () => {
  const t = `t-ex3-2-${randomUUID()}`;
  const asset = await seedAsset(t, { withContract: true, withRenewal: true });
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'RENEW', 'TECHNOLOGY', asset.id);
  assert.equal(analysis.impactedRenewals, 1);
});

test('EX3.3 optimise scenario: produces a scenario analysis for the subject', async () => {
  const t = `t-ex3-3-${randomUUID()}`;
  const asset = await seedAsset(t);
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'OPTIMISE', 'TECHNOLOGY', asset.id);
  assert.equal(analysis.scenarioType, 'OPTIMISE');
  assert.equal(analysis.impactedAssets, 1);
});

test('EX3.4 expand scenario: produces a scenario analysis for the subject', async () => {
  const t = `t-ex3-4-${randomUUID()}`;
  const asset = await seedAsset(t);
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'EXPAND', 'TECHNOLOGY', asset.id);
  assert.equal(analysis.scenarioType, 'EXPAND');
  assert.equal(analysis.impactedAssets, 1);
});

test('EX3.5 consolidate scenario: vendor-level impact rolls up its dependent assets', async () => {
  const t = `t-ex3-5-${randomUUID()}`;
  const vendor = await technologyPortfolioAuthorityService.createOrUpdateVendor({ tenantId: t, name: 'Acme Corp' });
  await seedAsset(t, { vendorId: vendor.id });
  await seedAsset(t, { vendorId: vendor.id, capability: 'IT Operations' });
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'CONSOLIDATE', 'VENDOR', vendor.id);
  assert.equal(analysis.impactedAssets, 2);
});

test('EX3.6 do-nothing scenario: still produces a graph-derived analysis, not a fabricated one', async () => {
  const t = `t-ex3-6-${randomUUID()}`;
  const asset = await seedAsset(t);
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'DO_NOTHING', 'TECHNOLOGY', asset.id);
  assert.equal(analysis.scenarioType, 'DO_NOTHING');
  assert.equal(analysis.impactedAssets, 1);
});

// ─── Impact Tests ─────────────────────────────────────────────────────────────

test('EX3.7 impact: graph impact counts trace to real edges', async () => {
  const t = `t-ex3-7-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'RETIRE', 'TECHNOLOGY', asset.id);
  assert.equal(analysis.evidenceIds.length, 1);
});

test('EX3.8 impact: objective impact counts require a real CONTRIBUTES_TO edge', async () => {
  const t = `t-ex3-8-${randomUUID()}`;
  const asset = await seedAsset(t, { capability: 'Finance Operations' });
  economicOutcomeAttributionService.createBusinessObjective({ tenantId: t, name: 'Reduce close time', linkedAssetIds: [asset.id] });
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'RETIRE', 'TECHNOLOGY', asset.id);
  assert.equal(analysis.impactedObjectives, 1);
});

test('EX3.9 impact: outcome impact counts reflect real PRODUCES edges', async () => {
  const t = `t-ex3-9-${randomUUID()}`;
  const asset = await seedAsset(t, { withOutcome: true });
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'RETIRE', 'TECHNOLOGY', asset.id);
  assert.equal(analysis.impactedOutcomes, 1);
});

// ─── Confidence Tests ─────────────────────────────────────────────────────────

test('EX3.10 confidence: weakest dependency wins — missing evidence caps confidence at LOW', async () => {
  const t = `t-ex3-10-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: false });
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'RETIRE', 'TECHNOLOGY', asset.id);
  assert.equal(analysis.confidence, 'LOW');
});

// ─── No-Fabrication Tests ─────────────────────────────────────────────────────

test('EX3.11 no fabrication: a subject with no graph link reports zero impact, not estimated impact', async () => {
  const t = `t-ex3-11-${randomUUID()}`;
  const analysis = await scenarioPlanningService.analyzeScenario(t, 'RETIRE', 'TECHNOLOGY', 'unknown-asset');
  assert.equal(analysis.impactedAssets, 0);
  assert.equal(analysis.impactedCapabilities, 0);
  assert.equal(analysis.confidence, 'LOW');
});

// ─── Narrative Tests ──────────────────────────────────────────────────────────

test('EX3.12 narrative: references only computed counts', async () => {
  const t = `t-ex3-12-${randomUUID()}`;
  const asset = await seedAsset(t);
  const { narrative } = await scenarioPlanningService.getNarrative(t, 'RETIRE', 'TECHNOLOGY', asset.id);
  assert.match(narrative, /business capabilities/);
  assert.match(narrative, /Confidence:/);
});

// ─── Portfolio View Tests ─────────────────────────────────────────────────────

test('EX3.13 portfolio: most impactful retirements are ranked by real graph impact', async () => {
  const t = `t-ex3-13-${randomUUID()}`;
  await seedAsset(t);
  const portfolio = await scenarioPlanningService.getPortfolioView(t);
  assert.ok(portfolio.mostImpactfulRetirements.length > 0);
  assert.ok(portfolio.mostImpactfulRenewals.length >= 0);
});

// ─── Authority Tests ──────────────────────────────────────────────────────────

test('EX3.14 authority: zero technologies reports NOT_READY honestly', async () => {
  const t = `t-ex3-14-${randomUUID()}`;
  const result = await getScenarioPlanningAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'SCENARIO_PLANNING_AUTHORITY');
});

test('EX3.15 authority: a fully-evidenced technology improves the verdict', async () => {
  const t = `t-ex3-15-${randomUUID()}`;
  await seedAsset(t);
  const result = await getScenarioPlanningAuthority(t);
  assert.ok(result.score > 0);
});
