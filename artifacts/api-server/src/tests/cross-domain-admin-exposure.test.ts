import test from 'node:test'; import assert from 'node:assert/strict';
import { detectCrossDomainAdminExposure } from '../lib/cross-domain/cross-domain-governance-intelligence';
test('contractor admin and multi-domain exposure escalates',()=>{ const r=detectCrossDomainAdminExposure([{tenantId:'t1',entityId:'u1',canonicalUserKey:'u@x.com',domain:'ADOBE',admin:true,contractor:true},{tenantId:'t1',entityId:'u1',canonicalUserKey:'u@x.com',domain:'ATLASSIAN',admin:true}]); assert.equal(r[0].adminExposureLevel,'MULTI_DOMAIN_ADMIN'); assert.equal(r[0].requiredReviewType,'HIGH_RISK_REVIEW');});
