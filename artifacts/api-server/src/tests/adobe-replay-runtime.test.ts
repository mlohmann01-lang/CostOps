import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
test("replay service has adobe event emit capability", ()=>{ const c=fs.readFileSync(new URL("../lib/observability/operational-telemetry-service.ts", import.meta.url),"utf8"); assert.equal(c.includes("ADOBE_REPLAY_VALIDATED"), true); assert.equal(c.includes("ADOBE_REPLAY_MISMATCH"), true); });
