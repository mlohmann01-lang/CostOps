import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
test("lifecycle edge guard rails exist", ()=>{ const s=fs.readFileSync(new URL("../lib/playbooks/playbook-recommendation-service.ts", import.meta.url),"utf8"); assert.equal(s.includes("SUPPRESSED"), true); assert.equal(s.includes("QUARANTINED"), true); });
