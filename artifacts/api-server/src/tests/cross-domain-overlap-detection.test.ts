import test from 'node:test'; import assert from 'node:assert/strict';
import { detectCrossDomainOverlapSignals } from '../lib/cross-domain/cross-domain-governance-intelligence';
test('overlap review signals generated',()=>{ const r=detectCrossDomainOverlapSignals([{tenantId:'t1',domainsInvolved:['M365','ATLASSIAN'],entitiesInvolved:['teams','wiki'],overlapFamily:'COLLABORATION',unknownUsage:true,governanceRisk:70,potentialSavingsRange:[100,300],supportingEvidence:{}}]); assert.equal(r[0].overlapType,'CROSS_DOMAIN_COLLABORATION_OVERLAP_REVIEW');});
