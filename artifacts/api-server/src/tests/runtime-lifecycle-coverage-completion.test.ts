import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";

test("lifecycle transition telemetry event is defined", ()=>{
  const s = fs.readFileSync(new URL("../lib/observability/operational-telemetry-service.ts", import.meta.url), "utf8");
  assert.equal(s.includes("M365_LIFECYCLE_TRANSITION"), true);
});
