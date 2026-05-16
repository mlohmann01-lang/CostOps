import test from "node:test"; import assert from "node:assert/strict";
test("duplicate detection candidate only", ()=>{ const keys=['a','a']; const dup=keys.filter((k,i)=>keys.indexOf(k)!==i); assert.equal(dup.length,1);});
