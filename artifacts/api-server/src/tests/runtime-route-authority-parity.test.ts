import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";

test("runtime route authority parity guardrails present", ()=>{
  const c = fs.readFileSync(new URL("../tests/platform-subsystem-boundaries.test.ts", import.meta.url), "utf8");
  assert.equal(c.includes("subsystem boundaries: new economic layer folders are non-mutating"), true);
  assert.equal(c.includes("avoid direct execution engine"), true);
  const r = fs.readFileSync(new URL("../tests/platform-operational-flow.test.ts", import.meta.url), "utf8");
  assert.equal(r.includes("platform operational flow composes deterministic lifecycle artifacts"), true);
  assert.equal(r.includes("workflowDecision"), true);
});
