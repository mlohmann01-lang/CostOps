import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("non-execution routes do not import execution-engine", () => {
  for (const route of ["../routes/recommendations.ts","../routes/workflow.ts","../routes/simulations.ts","../routes/governance.ts","../routes/outcomes.ts"]) {
    assert.equal(read(route).includes("execution-engine"), false);
  }
});

test("cross-domain layer remains non-executing", () => {
  const content = read("../lib/cross-domain/cross-domain-governance-intelligence.ts");
  assert.equal(content.includes("execution-engine"), false);
  assert.equal(content.includes("execute"), false);
});

test("scale simulation remains non-executing",()=>{ const scale=read('../lib/runtime-hardening/sustained-runtime-load-phase-c.ts'); assert.equal(scale.includes('execution-engine'), false); assert.equal(scale.includes('auto-approval'), false); assert.equal(scale.includes('workflow-triggered execution'), false); });
