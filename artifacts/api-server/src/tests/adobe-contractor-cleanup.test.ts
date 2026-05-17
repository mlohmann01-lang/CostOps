import test from "node:test"; import assert from "node:assert/strict";
import { adobeContractorCleanupPlaybook } from "../lib/playbooks/adobe-phase-a-playbooks";
test("adobe contractor cleanup detects inactive contractor", ()=>{ const r=adobeContractorCleanupPlaybook.evaluate({email:"c@v.com",displayName:"C",sku:"x",cost:11,days:100,contractorFlag:true,assignedLicenses:["cc"]}); assert.equal(r.matched, true); });
