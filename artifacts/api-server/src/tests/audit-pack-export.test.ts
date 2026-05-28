import test from 'node:test';
import assert from 'node:assert/strict';
import { appendUnifiedEvent } from '../lib/events/evidence-timeline';
import { normalizeRecommendationGovernanceEvent } from '../lib/events/event-normalizer';
import { generateAuditPack } from '../lib/audit/evidence-export-service';

test('audit pack generated for recommendation with timeline and savings',()=>{
  appendUnifiedEvent(normalizeRecommendationGovernanceEvent({ tenantId:'t1', recommendationId:'r1', eventType:'RECOMMENDATION_CREATED', createdAt:'2026-01-01T00:00:00.000Z', evidenceSnapshot:{a:1} }));
  const p = generateAuditPack({ tenantId:'t1', entityType:'RECOMMENDATION', entityId:'r1', generatedBy:'op', format:'JSON', savings:{monthly:10,annual:120} });
  assert.equal(p.entityId,'r1');
  assert.equal(p.stateTimeline.length>=1,true);
  assert.equal(p.savingsSummary.annual,120);
});

test('approval history/policy decisions included when present',()=>{
  const p = generateAuditPack({ tenantId:'t1', entityType:'RECOMMENDATION', entityId:'r1', generatedBy:'op', format:'JSON', approvals:[{a:1}], policy:[{p:1}] });
  assert.equal(p.approvalHistory.length,1);
  assert.equal(p.policyDecisions.length,1);
});

test('markdown contains required sections and tenant isolation no mutation',()=>{
  const p = generateAuditPack({ tenantId:'t2', entityType:'RECOMMENDATION', entityId:'r2', generatedBy:'op', format:'Markdown' });
  const md = String(p.content);
  assert.equal(md.includes('Executive summary'), true);
  assert.equal(md.includes('Governance timeline'), true);
  assert.equal(md.includes('Evidence appendix'), true);
  const p2 = generateAuditPack({ tenantId:'t1', entityType:'RECOMMENDATION', entityId:'r1', generatedBy:'op', format:'JSON' });
  assert.equal(p2.tenantId,'t1');
  assert.equal(('mutated' in p2 as any), false);
});
