import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
test("adobe reconciliation categories documented in implementation", ()=>{ const c=fs.readFileSync(new URL("../lib/playbooks/adobe-phase-a-playbooks.ts", import.meta.url),"utf8"); assert.equal(c.includes("unknown identity"), true); });
