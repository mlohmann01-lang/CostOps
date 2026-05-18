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

test("decision-intelligence has no direct mutation paths",()=>{ const detector=read("../lib/decision-intelligence/recommendation-conflict-detector.ts"); ["Graph","ServiceNow","license removal execution","approval bypass"].forEach(k=>assert.equal(detector.includes(k), false)); });


test("m365 integration excludes direct license mutation instructions",()=>{ const m=read("../lib/decision-intelligence/m365-expansion-pack-1.ts"); ["REMOVE /users","PATCH /users","direct licence removal","approval bypass"].forEach(k=>assert.equal(m.includes(k), false)); });


test("ai-economics boundary keywords absent",()=>{ const ai=read("../lib/ai-economics/ai-decision-intelligence-integration.ts")+read("../lib/ai-economics/ai-cost-playbooks.ts"); ["AUTO_EXECUTE","AUTO_REMEDIATE","approval bypass","direct vendor API mutation","new execution engine","new replay engine","new telemetry engine","new workflow engine"].forEach(k=>assert.equal(ai.includes(k), false)); });


test("cross-domain-economics boundary keywords absent",()=>{ const x=read("../lib/cross-domain-economics/cross-domain-recommendation-arbitration.ts")+read("../lib/cross-domain-economics/cross-domain-economic-report.ts"); ["AUTO_EXECUTE","AUTO_REMEDIATE","autonomous spend control","autonomous licence changes","autonomous model switching","autonomous procurement actions","direct vendor API mutation","approval bypass","execution engine creation","replay engine fork","telemetry engine fork","workflow engine fork","outcome-ledger fork"].forEach(k=>assert.equal(x.includes(k), false)); });
