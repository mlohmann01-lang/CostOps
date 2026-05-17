import test from "node:test"; import assert from "node:assert/strict";
import { AdobeEvidenceNormalizationService } from "../lib/adobe/adobe-evidence-normalization-service";
import { buildAdobeReconciliationFindings } from "../lib/adobe/adobe-reconciliation-runtime";
test("duplicate identity creates finding",()=>{ const n=new AdobeEvidenceNormalizationService().normalize({tenantId:"t",email:"a@b.com"}); const f=buildAdobeReconciliationFindings({...n,duplicateIdentity:true}); assert.equal(f.some(x=>x.findingType==="ADOBE_DUPLICATE_IDENTITY"),true); });
