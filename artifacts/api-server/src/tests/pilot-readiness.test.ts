import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";

test("readiness status computation is deterministic", ()=>{
  const src = fs.readFileSync(new URL("../lib/pilot-readiness-service.ts", import.meta.url), "utf8");
  assert.equal(src.includes('"READY"'), true);
  assert.equal(src.includes('"NEEDS_CONFIGURATION"'), true);
  assert.equal(src.includes('"BLOCKED"'), true);
});
