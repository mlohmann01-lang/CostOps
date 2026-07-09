import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { technologyPortfolioAuthorityService } from '../lib/technology-portfolio-authority/technology-portfolio-service';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { technologyInvestmentService } from '../lib/technology-investment-authority/technology-investment-service';
import { buildTechnologyGraph } from '../lib/technology-investment-authority/technology-graph-builder';
import { getTechnologyInvestmentAuthority } from '../lib/technology-investment-authority/technology-investment-authority';

async function seedAsset(tenantId: string, opts: {
  withOwner?: boolean; withCapability?: boolean; capability?: string; withOutcome?: boolean;
  withEvidence?: boolean; lifecycleStatus?: any; withContract?: boolean; withRenewal?: boolean;
} = {}) {
  const outcomeIds: string[] = [];
  if (opts.withOutcome !== false) {
    const outcome = economicOutcomeAttributionService.createEconomicOutcome({ tenantId, assetId: 'placeholder', assetType: 'APPLICATION', name: 'Faster resolution' });
    outcomeIds.push(outcome.id);
  }
  const asset = await technologyPortfolioAuthorityService.createOrUpdateAsset({
    tenantId,
    name: 'Support Suite',
    assetType: 'SAAS',
    lifecycleStatus: opts.lifecycleStatus ?? 'ACTIVE',
    ownerUserId: opts.withOwner === false ? undefined : 'jane.doe',
    businessCapability: opts.withCapability === false ? undefined : (opts.capability ?? 'Customer Service'),
    outcomeIds,
    evidenceRefs: opts.withEvidence === false ? [] : ['evidence-1'],
    contractIds: opts.withContract ? ['contract-1'] : [],
    renewalIds: opts.withRenewal ? ['renewal-1'] : [],
  });
  return asset;
}

// ─── Graph Tests ─────────────────────────────────────────────────────────────

test('X1.1 graph: deterministic node creation for an owned, mapped, evidenced asset', async () => {
  const t = `t-x1-1-${randomUUID()}`;
  const asset = await seedAsset(t);
  const acc = await buildTechnologyGraph(t);
  assert.ok(acc.nodes.has(`asset:${asset.id}`));
  assert.ok(acc.nodes.has('owner:jane.doe'));
  assert.ok([...acc.nodes.values()].some((n) => n.type === 'BUSINESS_CAPABILITY' && n.label === 'Customer Service'));
});

test('X1.2 graph: deterministic edge creation — owner OWNS asset', async () => {
  const t = `t-x1-2-${randomUUID()}`;
  const asset = await seedAsset(t);
  const acc = await buildTechnologyGraph(t);
  assert.ok(acc.edges.has(`edge:OWNS:owner:jane.doe:asset:${asset.id}`));
});

test('X1.3 graph: no fabricated edges — missing owner produces a gap, not an OWNS edge', async () => {
  const t = `t-x1-3-${randomUUID()}`;
  const asset = await seedAsset(t, { withOwner: false });
  const acc = await buildTechnologyGraph(t);
  const ownsEdges = [...acc.edges.values()].filter((e) => e.type === 'OWNS' && e.to === `asset:${asset.id}`);
  assert.equal(ownsEdges.length, 0);
  assert.ok(acc.gaps.some((g) => g.area === 'OWNERSHIP' && g.affectedNodeIds.includes(`asset:${asset.id}`)));
});

// ─── Capability Tests ────────────────────────────────────────────────────────

test('X1.4 capability: mapping reflects discovered metadata, not invented', async () => {
  const t = `t-x1-4-${randomUUID()}`;
  await seedAsset(t, { capability: 'Store Operations' });
  const capabilities = await technologyInvestmentService.getCapabilities(t);
  assert.ok(capabilities.some((c) => c.name === 'Store Operations' && c.supportingTechnologyIds.length === 1));
});

test('X1.5 capability: unknown capability handled honestly as CAPABILITY_UNKNOWN', async () => {
  const t = `t-x1-5-${randomUUID()}`;
  await seedAsset(t, { withCapability: false });
  const capabilities = await technologyInvestmentService.getCapabilities(t);
  assert.ok(capabilities.some((c) => c.name === 'CAPABILITY_UNKNOWN'));
});

test('X1.6 capability: coverage scoring reflects real mapping ratio', async () => {
  const t = `t-x1-6-${randomUUID()}`;
  await seedAsset(t, { capability: 'Finance Operations' });
  await seedAsset(t, { withCapability: false });
  const summary = await technologyInvestmentService.getSummary(t);
  assert.equal(summary.totalTechnologies, 2);
  assert.equal(summary.mappedCapabilities, 1);
});

// ─── Ownership Tests ──────────────────────────────────────────────────────────

test('X1.7 ownership: completeness reflects real ownership coverage', async () => {
  const t = `t-x1-7-${randomUUID()}`;
  await seedAsset(t);
  const summary = await technologyInvestmentService.getSummary(t);
  assert.equal(summary.ownershipCoverage, 1);
});

test('X1.8 ownership: missing owner is surfaced as a graph gap', async () => {
  const t = `t-x1-8-${randomUUID()}`;
  await seedAsset(t, { withOwner: false });
  const graph = await technologyInvestmentService.getGraph(t);
  assert.ok(graph.gaps.some((g) => g.area === 'OWNERSHIP'));
});

// ─── Recommendation Tests (all 6 decisions) ──────────────────────────────────

test('X1.9 recommendation: KEEP — owned, mapped, active, with outcomes and evidence', async () => {
  const t = `t-x1-9-${randomUUID()}`;
  const asset = await seedAsset(t);
  const rec = await technologyInvestmentService.getRecommendation(t, asset.id);
  assert.equal(rec.decision, 'KEEP');
});

test('X1.10 recommendation: REVIEW — missing owner', async () => {
  const t = `t-x1-10-${randomUUID()}`;
  const asset = await seedAsset(t, { withOwner: false });
  const rec = await technologyInvestmentService.getRecommendation(t, asset.id);
  assert.equal(rec.decision, 'REVIEW');
});

test('X1.11 recommendation: RETIRE — lifecycle is RETIRE_CANDIDATE', async () => {
  const t = `t-x1-11-${randomUUID()}`;
  const asset = await seedAsset(t, { lifecycleStatus: 'RETIRE_CANDIDATE' });
  const rec = await technologyInvestmentService.getRecommendation(t, asset.id);
  assert.equal(rec.decision, 'RETIRE');
});

test('X1.12 recommendation: CONSOLIDATE — lifecycle is DUPLICATE', async () => {
  const t = `t-x1-12-${randomUUID()}`;
  const asset = await seedAsset(t, { lifecycleStatus: 'DUPLICATE' });
  const rec = await technologyInvestmentService.getRecommendation(t, asset.id);
  assert.equal(rec.decision, 'CONSOLIDATE');
});

test('X1.13 recommendation: RENEW — contract exists with no tracked renewal', async () => {
  const t = `t-x1-13-${randomUUID()}`;
  const asset = await seedAsset(t, { withContract: true, withRenewal: false });
  const rec = await technologyInvestmentService.getRecommendation(t, asset.id);
  assert.equal(rec.decision, 'RENEW');
});

test('X1.14 recommendation: OPTIMISE — lifecycle is NON_COMPLIANT', async () => {
  const t = `t-x1-14-${randomUUID()}`;
  const asset = await seedAsset(t, { lifecycleStatus: 'NON_COMPLIANT' });
  const rec = await technologyInvestmentService.getRecommendation(t, asset.id);
  assert.equal(rec.decision, 'OPTIMISE');
});

// ─── Authority Tests ──────────────────────────────────────────────────────────

test('X1.15 authority: zero technologies reports NOT_READY honestly', async () => {
  const t = `t-x1-15-${randomUUID()}`;
  const result = await getTechnologyInvestmentAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'TECHNOLOGY_INVESTMENT_AUTHORITY');
});

test('X1.16 authority: a fully-evidenced technology improves the verdict and reports real coverage', async () => {
  const t = `t-x1-16-${randomUUID()}`;
  await seedAsset(t);
  const result = await getTechnologyInvestmentAuthority(t);
  assert.equal(result.portfolioCoverage.total, 1);
  assert.ok(result.score > 0);
});

// ─── API / Tenant Isolation Tests ────────────────────────────────────────────

test('X1.17 tenant isolation: technology graphs never mix data across tenants', async () => {
  const tA = `t-x1-17a-${randomUUID()}`;
  const tB = `t-x1-17b-${randomUUID()}`;
  await seedAsset(tA);
  const summaryB = await technologyInvestmentService.getSummary(tB);
  assert.equal(summaryB.totalTechnologies, 0);
});

// ─── Gap Tests ────────────────────────────────────────────────────────────────

test('X1.18 gap: missing capability, outcome, and evidence each generate a graph gap', async () => {
  const t = `t-x1-18-${randomUUID()}`;
  const asset = await seedAsset(t, { withCapability: false, withOutcome: false, withEvidence: false });
  const graph = await technologyInvestmentService.getGraph(t);
  const affected = (area: string) => graph.gaps.some((g) => g.area === area && g.affectedNodeIds.includes(`asset:${asset.id}`));
  assert.ok(affected('CAPABILITY_MAPPING'));
  assert.ok(affected('OUTCOME_LINKAGE'));
  assert.ok(affected('EVIDENCE_LINKAGE'));
});

test('X1.19 gap: missing renewal on a contracted asset generates a RENEWAL_VISIBILITY gap', async () => {
  const t = `t-x1-19-${randomUUID()}`;
  const asset = await seedAsset(t, { withContract: true, withRenewal: false });
  const graph = await technologyInvestmentService.getGraph(t);
  assert.ok(graph.gaps.some((g) => g.area === 'RENEWAL_VISIBILITY' && g.affectedNodeIds.includes(`asset:${asset.id}`)));
});

// ─── Narrative Tests ──────────────────────────────────────────────────────────

test('X1.20 narrative: references real factors, not invented ones', async () => {
  const t = `t-x1-20-${randomUUID()}`;
  const asset = await seedAsset(t);
  const { narrative, recommendation } = await technologyInvestmentService.getNarrative(t, asset.id);
  assert.match(narrative, /Recommendation:/);
  assert.match(narrative, /Owner:/);
  assert.equal(recommendation.decision, 'KEEP');
});
