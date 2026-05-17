import test from 'node:test'; import assert from 'node:assert/strict';
import { AtlassianEvidenceNormalizationService } from '../lib/atlassian/atlassian-evidence-normalization-service';
test('UNKNOWN evidence explicitly handled',()=>{ const s=new AtlassianEvidenceNormalizationService(); const n=s.normalize({tenantId:'t1',email:'U@X.COM'}); assert.equal(n.siteId,'UNKNOWN_SITE_MAPPING'); assert.equal(n.usageSignal.usageConfidence,'UNKNOWN_USAGE_CONFIDENCE'); assert.equal(n.recommendationContext.unknownOwner,true); });
