import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
test("runtime health/orphan detection hook exists", ()=>{ const s=fs.readFileSync(new URL("../lib/support-diagnostics-service.ts", import.meta.url),"utf8"); assert.equal(s.includes("orphanStateCount"), true); assert.equal(s.includes("getRuntimeHealthAssertions"), true); });
