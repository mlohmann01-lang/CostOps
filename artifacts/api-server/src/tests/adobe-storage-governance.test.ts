import test from "node:test"; import assert from "node:assert/strict";
import { adobeStorageGovernanceReview } from "../lib/playbooks/adobe-phase-b-playbooks";
test("storage unknown/owner missing is candidate",()=>{ const r=adobeStorageGovernanceReview.evaluate({email:"a@b.com",displayName:"A",storageConsumption:100,owner:""}); assert.equal(r.matched,true); });
