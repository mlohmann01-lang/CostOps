import test from "node:test"; import assert from "node:assert/strict";
import { scoreAdobeTrust } from "../lib/adobe/adobe-trust-scoring"; import { AdobeEvidenceNormalizationService } from "../lib/adobe/adobe-evidence-normalization-service";
test("graph/correlation proxy affects trust via contractor uncertainty",()=>{ const n=new AdobeEvidenceNormalizationService().normalize({tenantId:"t",email:"a@b.com",contractorFlag:true,federatedIdentity:null}); const s=scoreAdobeTrust(n); assert.equal(["LOW","QUARANTINED","MEDIUM"].includes(s.trustBand),true); });
