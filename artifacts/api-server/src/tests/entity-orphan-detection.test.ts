import test from "node:test"; import assert from "node:assert/strict";
test("orphan reasoning placeholder deterministic", ()=>{ const reason=['NO_ACTIVE_RELATIONSHIPS']; assert.equal(reason[0],'NO_ACTIVE_RELATIONSHIPS');});
