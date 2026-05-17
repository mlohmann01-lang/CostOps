import test from "node:test"; import assert from "node:assert/strict";
import { AdobeEvidenceNormalizationService } from "../lib/adobe/adobe-evidence-normalization-service";
test("adobe normalization handles UNKNOWN fields", ()=>{ const s=new AdobeEvidenceNormalizationService(); const n=s.normalize({tenantId:"t1", email:"User@Example.com"}); assert.equal(n.user.identityType,"UNKNOWN_IDENTITY_TYPE"); assert.equal(n.license.entitlementSource,"UNKNOWN_ENTITLEMENT_SOURCE"); assert.equal(n.account.owner,"UNKNOWN_OWNER"); assert.equal(n.usageSignal.usageConfidence,"UNKNOWN_USAGE_CONFIDENCE"); });
