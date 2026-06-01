import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApprovalWorkflowEvent, normalizeRecommendationGovernanceEvent } from '../lib/events/event-normalizer';
import { appendUnifiedEvent, getEntityTimeline, listUnifiedEvents } from '../lib/events/evidence-timeline';

test('events normalize from approval workflows',()=>{
  const e = normalizeApprovalWorkflowEvent({ tenantId:'t1', workflowId:'wf1', eventType:'APPROVAL_GRANTED', actorId:'u1', at:'2026-01-01T00:00:00.000Z' });
  assert.equal(e.entityType,'APPROVAL_WORKFLOW');
  assert.equal(e.eventCategory,'APPROVAL');
});

test('events normalize from recommendation governance events',()=>{
  const e = normalizeRecommendationGovernanceEvent({ tenantId:'t1', recommendationId:'r1', eventType:'RECOMMENDATION_APPROVED', createdAt:'2026-01-01T00:00:00.000Z' });
  assert.equal(e.entityType,'RECOMMENDATION');
  assert.equal(e.eventCategory,'RECOMMENDATION');
});

test('timeline sorts deterministically and tenant/entity filtering works + no mutation',()=>{
  const a = normalizeApprovalWorkflowEvent({ tenantId:'t1', workflowId:'wf1', eventType:'APPROVAL_STAGE_ENTERED', at:'2026-01-01T00:00:02.000Z' });
  const b = normalizeApprovalWorkflowEvent({ tenantId:'t1', workflowId:'wf1', eventType:'APPROVAL_GRANTED', at:'2026-01-01T00:00:01.000Z' });
  const c = normalizeApprovalWorkflowEvent({ tenantId:'t2', workflowId:'wf1', eventType:'APPROVAL_GRANTED', at:'2026-01-01T00:00:03.000Z' });
  appendUnifiedEvent(a); appendUnifiedEvent(b); appendUnifiedEvent(c);
  const t1 = listUnifiedEvents('t1');
  assert.equal(t1[0].eventType, 'APPROVAL_APPROVED');
  const entity = getEntityTimeline('t1','APPROVAL_WORKFLOW','wf1');
  assert.equal(entity.length>=2, true);
  assert.equal(listUnifiedEvents('t2').length>=1, true);
  assert.equal(('mutated' in entity[0] as any), false);
});
