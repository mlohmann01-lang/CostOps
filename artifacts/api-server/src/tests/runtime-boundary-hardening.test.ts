import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
test('runtime boundaries preserved',()=>{ const c=fs.readFileSync(new URL('../lib/runtime-hardening/runtime-hardening-phase-a.ts', import.meta.url),'utf8'); ['execution-engine','auto-approval','mutation'].forEach(k=>assert.equal(c.includes(k),false));});
