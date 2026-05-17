import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
test('replay statuses inherited',()=>{ const s=fs.readFileSync(new URL('../lib/playbooks/playbook-recommendation-service.ts', import.meta.url),'utf8'); for (const k of ['VALID','PARTIAL','INCOMPLETE','MISMATCH']) assert.equal(s.includes(k),true); });
