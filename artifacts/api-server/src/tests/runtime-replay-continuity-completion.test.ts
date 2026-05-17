import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";

test("replay continuity event family registered", ()=>{
  const s = fs.readFileSync(new URL("../lib/observability/operational-telemetry-service.ts", import.meta.url), "utf8");
  assert.equal(s.includes("M365_REPLAY_VALIDATED"), true);
  assert.equal(s.includes("M365_REPLAY_MISMATCH"), true);
});
