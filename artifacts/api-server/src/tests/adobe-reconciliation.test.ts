import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import { resolve } from "node:path";
test("adobe reconciliation categories documented in implementation", ()=>{ const c=fs.readFileSync(resolve(process.cwd(),"src/lib/playbooks/adobe-phase-a-playbooks.ts"),"utf8"); assert.equal(c.includes("unknown identity"), true); });
