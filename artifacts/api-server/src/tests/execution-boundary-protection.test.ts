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

test('economic-forecasting has no execution/runtime expansion keywords',()=>{ const ef=read('../lib/economic-forecasting/forecast-confidence-engine.ts')+read('../lib/economic-forecasting/economic-intelligence-report.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','autonomous procurement','autonomous budget mutation','autonomous vendor actions','direct SaaS mutation','approval bypass','execution-engine creation','replay-engine fork','telemetry-engine fork','workflow-engine fork','outcome-ledger fork'].forEach(k=>assert.equal(ef.includes(k), false)); });

test('economic-simulation has no execution/runtime expansion keywords',()=>{ const sim=read('../lib/economic-simulation/scenario-definition-engine.ts')+read('../lib/economic-simulation/economic-scenario-report.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','autonomous procurement','autonomous SaaS mutation','autonomous vendor actions','approval bypass','execution engine creation','replay engine forks','telemetry engine forks','workflow engine forks'].forEach(k=>assert.equal(sim.includes(k), false)); });


test('economic-memory module remains non-executing and non-mutating',()=>{ const mem=read('../lib/economic-memory/index.ts')+read('../lib/economic-memory/economic-memory-report.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','autonomous procurement','budget mutation','vendor mutation','policy mutation','execution engine','replay fork','telemetry fork','workflow fork'].forEach(k=>assert.equal(mem.includes(k), false)); });

test('finops-operationalization remains governed non-mutating',()=>{ const mem=read('../lib/finops-operationalization/index.ts')+read('../lib/finops-operationalization/finops-operationalization-report.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','direct cloud mutation','resource deletion','resource resize execution','commitment purchase','ServiceNow API mutation','budget mutation','vendor mutation','approval bypass','new execution engine','replay fork','telemetry fork','workflow fork'].forEach(k=>assert.equal(mem.includes(k), false)); });

test('executive-economic-governance remains non-mutating',()=>{ const body=read('../lib/executive-economic-governance/index.ts')+read('../lib/executive-economic-governance/executive-economic-governance-report.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','autonomous budgeting','autonomous procurement','policy mutation','ERP mutation','ServiceNow mutation','cloud mutation','vendor mutation','execution engine','replay fork','telemetry fork','workflow fork'].forEach(k=>assert.equal(body.includes(k), false)); });
