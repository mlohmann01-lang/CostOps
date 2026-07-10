import test from 'node:test';
import assert from 'node:assert/strict';
import { aiCapitalAllocationAuthorityService } from '../lib/ai-capital-allocation/ai-capital-allocation-service';
import { aiInitiativePortfolioService } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-service';

// Proves "Wire capital allocation to lineage resolvers": the exported singleton must no
// longer be constructed with the default (empty) resolvers, which made every
// /initiatives/:id/allocation call fall into INSUFFICIENT_DATA regardless of the
// initiative's real portfolio/economics/attribution history.

test('the exported singleton resolves a real initiative\'s lineage instead of always returning undefined', async () => {
  const tenantId = `tenant-capalloc-lineage-${Date.now()}`;
  const initiative = await aiInitiativePortfolioService.createInitiative({ tenantId, name: 'Real Initiative', initiativeType: 'GEN_AI', sourceSystem: 'test' } as any);

  const allocation = await aiCapitalAllocationAuthorityService.evaluateAllocation(tenantId, initiative.id, 1000);
  // The lineage must resolve (not be undefined) now that the initiative exists — proven
  // by the rationale no longer being the "missing initiative context" message, which is
  // returned only when resolveInitiativeLineage itself returns undefined.
  assert.notEqual(allocation.rationale, 'Missing initiative context: no portfolio lineage is available for this initiative.');
});

test('an initiative that does not exist still resolves to undefined lineage (graceful, not a thrown error)', async () => {
  const tenantId = `tenant-capalloc-lineage-missing-${Date.now()}`;
  const allocation = await aiCapitalAllocationAuthorityService.evaluateAllocation(tenantId, 'never-created-initiative', 1000);
  assert.equal(allocation.allocationVerdict, 'INSUFFICIENT_DATA');
  assert.equal(allocation.rationale, 'Missing initiative context: no portfolio lineage is available for this initiative.');
});

test('the exported singleton\'s listInitiatives resolver enumerates real initiatives for the tenant (used by recommendations/summary)', async () => {
  const tenantId = `tenant-capalloc-lineage-list-${Date.now()}`;
  const initiative = await aiInitiativePortfolioService.createInitiative({ tenantId, name: 'Listable Initiative', initiativeType: 'GEN_AI', sourceSystem: 'test' } as any);

  const recommendations = await aiCapitalAllocationAuthorityService.getCapitalAllocationRecommendations(tenantId);
  // Before the fix, listInitiatives was undefined and evaluateAllInitiatives() always
  // evaluated zero initiatives, regardless of what existed for the tenant.
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].initiativeId, initiative.id);
});
