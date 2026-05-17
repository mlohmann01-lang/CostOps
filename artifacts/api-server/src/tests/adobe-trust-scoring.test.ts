import test from "node:test"; import assert from "node:assert/strict";
import { AdobeEvidenceNormalizationService } from "../lib/adobe/adobe-evidence-normalization-service";
import { scoreAdobeTrust } from "../lib/adobe/adobe-trust-scoring";
test("adobe trust degrades and quarantines", ()=>{ const s=new AdobeEvidenceNormalizationService(); const low=scoreAdobeTrust(s.normalize({tenantId:"t",email:"a@b.com",identityType:"UNKNOWN"})); assert.equal(["LOW","QUARANTINED","MEDIUM"].includes(low.trustBand), true); const high=scoreAdobeTrust(s.normalize({tenantId:"t",email:"a@b.com",identityType:"FEDERATED_ID",usageConfidence:"HIGH",owner:"o",federatedIdentity:"id"})); assert.equal(high.trustBand,"HIGH"); });
