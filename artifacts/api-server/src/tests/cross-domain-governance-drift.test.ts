import test from 'node:test'; import assert from 'node:assert/strict';
import { computeCrossDomainGovernanceDrift } from '../lib/cross-domain/cross-domain-governance-intelligence';
test('cross-domain drift signals include domains involved',()=>{ const r=computeCrossDomainGovernanceDrift([{tenantId:'t1',domainsInvolved:['M365','ADOBE'],driftCategory:'UNKNOWN_OWNERSHIP_GROWTH',growthRate:0.4,supportingEvidence:{}}]); assert.equal(r[0].domainsInvolved.length,2); assert.equal(Boolean(r[0].correlationId&&r[0].traceId),true);});
