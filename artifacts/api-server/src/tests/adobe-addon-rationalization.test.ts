import test from "node:test"; import assert from "node:assert/strict";
import { adobeStockAddonReclaim } from "../lib/playbooks/adobe-phase-b-playbooks";
test("add-on unknown usage is review candidate",()=>{ const r=adobeStockAddonReclaim.evaluate({email:"a@b.com",displayName:"A",addOn:"STOCK",addOnUsage:"UNKNOWN"}); assert.equal(r.matched,true); });
