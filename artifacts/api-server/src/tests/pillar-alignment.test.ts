import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pillarTaxonomyAudit,
  surfacesForPillar,
  findOrphanedSurfaces,
} from '../lib/platform-taxonomy/pillar-taxonomy-audit';
import { platformStoryRegistry, pillarStorySequence, pillarStory } from '../lib/platform-taxonomy/platform-story-registry';
import { duplicateConceptAudit, duplicateConceptAuditCompletes } from '../lib/platform-taxonomy/duplicate-concept-audit';
import { ExecutiveProofPackService } from '../lib/executive-proof-packs';

const PILLARS = ['AUTO_EXECUTION', 'VALUE_REALISATION', 'PROTECTED_GOVERNANCE', 'SHARED_PLATFORM'];

test('every taxonomy surface classifies into a known pillar', () => {
  assert.ok(pillarTaxonomyAudit.length > 0, 'taxonomy registry must not be empty');
  for (const entry of pillarTaxonomyAudit) {
    assert.ok(PILLARS.includes(entry.pillar), `${entry.id} has unknown pillar ${entry.pillar}`);
  }
});

test('all nav entries classify into pillars', () => {
  const navEntries = pillarTaxonomyAudit.filter((e) => e.kind === 'NAV_ITEM');
  assert.ok(navEntries.length >= 20, 'expected the full reorganised nav to be represented');
  for (const entry of navEntries) assert.ok(PILLARS.includes(entry.pillar));
});

test('no orphaned surface ids exist outside pillar classification', () => {
  const knownIds = pillarTaxonomyAudit.map((e) => e.id);
  assert.deepEqual(findOrphanedSurfaces(knownIds), [], 'every known id must resolve to a classified surface');
  assert.deepEqual(findOrphanedSurfaces(['nav:does-not-exist']), ['nav:does-not-exist']);
});

test('each pillar has at least one classified surface', () => {
  for (const pillar of ['AUTO_EXECUTION', 'VALUE_REALISATION', 'PROTECTED_GOVERNANCE'] as const) {
    assert.ok(surfacesForPillar(pillar).length > 0, `${pillar} must own at least one surface`);
  }
});

test('platform story registry covers all three pillars with title/narrative/question', () => {
  for (const story of pillarStorySequence) {
    assert.ok(story.title);
    assert.ok(story.narrative);
    assert.ok(story.question);
  }
  assert.equal(pillarStorySequence.length, 3);
  assert.equal(pillarStory('SHARED_PLATFORM'), undefined);
  assert.equal(platformStoryRegistry.VALUE_REALISATION.narrative, 'We prove technology investments create measurable value.');
});

test('duplicate concept audit completes with a disposition for every entry', () => {
  assert.ok(duplicateConceptAudit.length > 0);
  assert.ok(duplicateConceptAuditCompletes());
  for (const entry of duplicateConceptAudit) {
    assert.ok(['KEEP', 'MERGE', 'RENAME', 'DEPRECATE'].includes(entry.disposition));
  }
});

test('dashboard metrics map to pillars per Auto Execution / Value Realisation / Protected Governance', () => {
  const metricEntries = pillarTaxonomyAudit.filter((e) => e.kind === 'DASHBOARD_METRIC');
  const byPillar = new Set(metricEntries.map((e) => e.pillar));
  assert.ok(byPillar.has('AUTO_EXECUTION'));
  assert.ok(byPillar.has('VALUE_REALISATION'));
  assert.ok(byPillar.has('PROTECTED_GOVERNANCE'));
});

test('proof packs expose a pillar-aligned narrative answering the three pillar questions', async () => {
  const svc = new ExecutiveProofPackService();
  const pack = await svc.buildProofPack('pillar-narrative-tenant', 'CIO', { metrics: {}, portfolioSnapshotId: 'ps' });
  const narrative = (pack.metrics as any).pillarNarrative as Array<{ pillar: string; question: string; narrative: string }>;
  assert.ok(Array.isArray(narrative) && narrative.length === 3, 'proof pack must expose a 3-pillar narrative');
  assert.deepEqual(narrative.map((n) => n.pillar), ['AUTO_EXECUTION', 'VALUE_REALISATION', 'PROTECTED_GOVERNANCE']);
  for (const entry of narrative) {
    assert.ok(entry.question.length > 0);
    assert.ok(entry.narrative.length > 0);
  }
});
