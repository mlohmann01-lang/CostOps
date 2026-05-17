import test from "node:test"; import assert from "node:assert/strict";
import { adobeInactiveLicenseReclaimPlaybook } from "../lib/playbooks/adobe-phase-a-playbooks";
test("adobe inactive reclaim excludes admin", ()=>{ const r=adobeInactiveLicenseReclaimPlaybook.evaluate({email:"a@b.com",displayName:"A",sku:"x",cost:10,days:120,assignedLicenses:["cc"],isAdmin:true}); assert.equal(r.matched,true); assert.equal(r.exclusions.includes("admin account"), true); });
