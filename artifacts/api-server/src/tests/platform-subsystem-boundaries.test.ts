import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { containsForbiddenTerm } from "./helpers/boundary-term-scan";

const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
function containsForbiddenTerm(body: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(body);
}


test("subsystem boundaries: recommendations/simulations/workflow avoid direct execution engine", () => {
  const recommendations = read("../routes/recommendations.ts");
  const simulations = read("../routes/simulations.ts");
  const workflow = read("../routes/workflow.ts");
  assert.equal(recommendations.includes("execution-engine"), false);
  assert.equal(simulations.includes("execution-engine"), false);
  assert.equal(workflow.includes("execution-engine"), false);
});

test("subsystem boundaries: graph and telemetry are tenant scoped", () => {
  const graph = read("../routes/graph.ts");
  const telemetry = read("../routes/telemetry.ts");
  assert.equal(graph.includes("tenantId"), true);
  assert.equal(telemetry.includes("tenantId"), true);
});

test("subsystem boundaries: support diagnostics and boundary docs exist", () => {
  const pilotRoute = read("../routes/pilot.ts");
  const contracts = read("../../../../docs/architecture/subsystem-boundary-contracts.md");
  assert.equal(pilotRoute.includes("support/diagnostics"), true);
  assert.equal(contracts.includes("Route authority"), true);
  assert.equal(contracts.includes("No execution expansion"), true);
  assert.equal(contracts.includes("cross-domain execution"), false);
});

test("subsystem boundaries: runtime hardening remains non-executing",()=>{ const hard=read("../lib/runtime-hardening/runtime-hardening-phase-a.ts"); assert.equal(hard.includes("execution-engine"), false); });

test("subsystem boundaries: sustained load simulation remains canonical helper only",()=>{ const scale=read('../lib/runtime-hardening/sustained-runtime-load-phase-c.ts'); assert.equal(scale.includes('class '), false); assert.equal(scale.includes('new telemetry subsystem'), false); assert.equal(scale.includes('execute'), false); });

test("decision-intelligence boundary keywords absent",()=>{ const di=read("../lib/decision-intelligence/recommendation-confidence-engine.ts"); ["AUTO_EXECUTE","AUTO_REMEDIATE","workflow engine","replay engine","telemetry engine"].forEach(k=>assert.equal(containsForbiddenTerm(di, k), false)); });


test("m365 recommendation packaging layer keeps outcome-ledger boundaries",()=>{ const m=read("../lib/decision-intelligence/m365-expansion-pack-1.ts"); ["new outcome ledger system","new replay system","new telemetry system"].forEach(k=>assert.equal(containsForbiddenTerm(m, k), false)); });


test("ai-economics boundary keywords absent",()=>{ const ai=read("../lib/ai-economics/ai-decision-intelligence-integration.ts")+read("../lib/ai-economics/ai-cost-playbooks.ts"); ["AUTO_EXECUTE","AUTO_REMEDIATE","approval bypass","direct vendor API mutation","new execution engine","new replay engine","new telemetry engine","new workflow engine"].forEach(k=>assert.equal(containsForbiddenTerm(ai, k), false)); });


test("cross-domain-economics boundary keywords absent",()=>{ const x=read("../lib/cross-domain-economics/cross-domain-recommendation-arbitration.ts")+read("../lib/cross-domain-economics/cross-domain-economic-report.ts"); ["AUTO_EXECUTE","AUTO_REMEDIATE","autonomous spend control","autonomous licence changes","autonomous model switching","autonomous procurement actions","direct vendor API mutation","approval bypass","execution engine creation","replay engine fork","telemetry engine fork","workflow engine fork","outcome-ledger fork"].forEach(k=>assert.equal(containsForbiddenTerm(x, k), false)); });

test('economic-forecasting remains non-executing subsystem',()=>{ const ef=read('../lib/economic-forecasting/economic-risk-forecast.ts')+read('../lib/economic-forecasting/spend-forecast-engine.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','autonomous procurement','autonomous budget mutation','autonomous vendor actions','direct SaaS mutation','approval bypass','execution-engine creation','replay-engine fork','telemetry-engine fork','workflow-engine fork','outcome-ledger fork'].forEach(k=>assert.equal(containsForbiddenTerm(ef, k), false)); });

test('economic-simulation remains non-executing subsystem',()=>{ const sim=read('../lib/economic-simulation/scenario-comparison-engine.ts')+read('../lib/economic-simulation/scenario-risk-simulation.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','autonomous procurement','autonomous SaaS mutation','autonomous vendor actions','approval bypass','execution engine creation','replay engine forks','telemetry engine forks','workflow engine forks'].forEach(k=>assert.equal(containsForbiddenTerm(sim, k), false)); });


test('economic-memory module remains non-executing and non-mutating',()=>{ const mem=read('../lib/economic-memory/index.ts')+read('../lib/economic-memory/economic-memory-report.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','autonomous procurement','budget mutation','vendor mutation','policy mutation','execution engine','replay fork','telemetry fork','workflow fork'].forEach(k=>assert.equal(containsForbiddenTerm(mem, k), false)); });

test('finops-operationalization remains governed non-mutating',()=>{ const mem=read('../lib/finops-operationalization/index.ts')+read('../lib/finops-operationalization/finops-operationalization-report.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','direct cloud mutation','resource deletion','resource resize execution','commitment purchase','ServiceNow API mutation','budget mutation','vendor mutation','approval bypass','new execution engine','replay fork','telemetry fork','workflow fork'].forEach(k=>assert.equal(containsForbiddenTerm(mem, k), false)); });

test('executive-economic-governance remains non-mutating',()=>{ const body=read('../lib/executive-economic-governance/index.ts')+read('../lib/executive-economic-governance/executive-economic-governance-report.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','autonomous budgeting','autonomous procurement','policy mutation','ERP mutation','ServiceNow mutation','cloud mutation','vendor mutation','execution engine','replay fork','telemetry fork','workflow fork'].forEach(k=>assert.equal(containsForbiddenTerm(body, k), false)); });
test('subsystem boundaries: enterprise decision module remains recommendation-only',()=>{ const body=read('../lib/enterprise-economic-decision/index.ts')+read('../lib/enterprise-economic-decision/enterprise-decision-report.ts'); ['AUTO_EXECUTE','AUTO_REMEDIATE','execution-engine','workflow engine','ui component'].forEach(k=>assert.equal(containsForbiddenTerm(body, k), false)); });


test('cloud-economic-intelligence boundaries enforced',()=>{ const dir=new URL('../lib/cloud-economic-intelligence/', import.meta.url); const names=fs.readdirSync(dir); const body=names.map((n)=>fs.readFileSync(new URL(`../lib/cloud-economic-intelligence/${n}`, import.meta.url),'utf8')).join('\n').toLowerCase(); ['auto_execute','auto_remediate','resource deletion','resource resize execution','commitment purchase','direct aws mutation','direct azure mutation','direct gcp mutation','cloud mutation','budget mutation','vendor mutation','execution engine','telemetry fork','replay fork','workflow fork','ui route','ui component'].forEach((k)=>assert.equal(containsForbiddenTerm(body, k), false)); });

test('commitment-economics boundaries enforced',()=>{ const dir=new URL('../lib/commitment-economics/', import.meta.url); const names=fs.readdirSync(dir); const body=names.map((n)=>fs.readFileSync(new URL(`../lib/commitment-economics/${n}`, import.meta.url),'utf8')).join('\n').toLowerCase(); ['auto_execute','auto_remediate','commitment purchase','reservation purchase','direct aws mutation','direct azure mutation','direct gcp mutation','cloud mutation','budget mutation','vendor mutation','execution engine','telemetry fork','replay fork','workflow fork','ui route','ui component'].forEach((k)=>assert.equal(containsForbiddenTerm(body, k), false)); });

test('kubernetes-economics boundaries enforced',()=>{ const dir=new URL('../lib/kubernetes-economics/', import.meta.url); const names=fs.readdirSync(dir); const body=names.map((n)=>fs.readFileSync(new URL(`../lib/kubernetes-economics/${n}`, import.meta.url),'utf8')).join('\n').toLowerCase(); ['auto_execute','auto_remediate','pod deletion','node scaling','cluster mutation','namespace deletion','workload mutation','direct kubernetes api mutation','direct cloud mutation','execution engine','telemetry fork','replay fork','workflow fork','ui route','ui component'].forEach((k)=>assert.equal(containsForbiddenTerm(body, k), false)); });

test('subsystem boundaries: new economic layer folders are non-mutating',()=>{ const dirs=['../lib/economic-intelligence-kernel/','../lib/economic-causality/','../lib/economic-memory-drift/','../lib/ai-runtime-economics/']; const forbidden=['kubectl','deletepod','deletedeployment','patchdeployment','scaledeployment','applymanifest','createjob','deletejob','restartpod','cordon','drain','taint','autoscale','setreplicas','cloudexecute','executeaws','executeazure','executegcp','remediate','autoremediate','mutate','mutationpayload','workflowfork','runtimefork','replayfork','orchestrationfork','agentexecute','modelroute','promptrewrite','gpuschedule']; dirs.forEach((d)=>{ const body=fs.readdirSync(new URL(d, import.meta.url)).map((n)=>read(`${d}${n}`)).join('\n').toLowerCase(); forbidden.forEach((k)=>assert.equal(containsForbiddenTerm(body, k), false)); }); });


test('next maturity economic layers enforce forbidden terms',()=>{ const dirs=['../lib/semantic-hardening/','../lib/cross-layer-integration/','../lib/calibration-realism/','../lib/economic-arbitration/']; const forbidden=['kubectl','deletepod','patchdeployment','restartpod','scaledeployment','applymanifest','cloudexecute','executeaws','executeazure','executegcp','agentexecute','modelroute','promptrewrite','gpuschedule','autooptimize','autoremediate','mutate','mutationpayload','workflowfork','runtimefork','replayfork','orchestrationfork','autonomousoptimization','policyexecution','dynamicexecution']; dirs.forEach((d)=>{ const dir=new URL(d, import.meta.url); const body=fs.readdirSync(dir).map((n)=>fs.readFileSync(new URL(`${d}${n}`, import.meta.url),'utf8')).join('\n').toLowerCase(); forbidden.forEach((k)=>assert.equal(containsForbiddenTerm(body, k), false));});});


test('sprint folders enforce forbidden terms',()=>{ const dirs=['../lib/contract-migration/','../lib/golden-path/','../lib/economic-arbitration/','../lib/oracle-java-governance/']; const forbidden=['kubectl','deletepod','patchdeployment','restartpod','scaledeployment','applymanifest','cloudexecute','executeaws','executeazure','executegcp','agentexecute','modelroute','promptrewrite','gpuschedule','autooptimize','autoremediate','mutate','mutationpayload','workflowfork','runtimefork','replayfork','orchestrationfork','autonomousoptimization','policyexecution','dynamicexecution','uninstalljava','removejava','changeoracleconfig','alterdatabase','migrateworkload','reassignlicense','scanendpoint','deployagent']; dirs.forEach((d)=>{ const body=fs.readdirSync(new URL(d, import.meta.url)).map((n)=>fs.readFileSync(new URL(`${d}${n}`, import.meta.url),'utf8')).join('\n').toLowerCase(); forbidden.forEach((k)=>assert.equal(containsForbiddenTerm(body, k), false)); });});



test('new maturity sprint folders enforce forbidden terms',()=>{ const dirs=['../lib/calibration-weighting/','../lib/economic-graph/','../lib/economic-policy-language/','../lib/scenario-benchmarks/']; const forbidden=['kubectl','deletepod','patchdeployment','restartpod','scaledeployment','applymanifest','cloudexecute','executeaws','executeazure','executegcp','agentexecute','modelroute','promptrewrite','gpuschedule','autooptimize','autoremediate','mutate','mutationpayload','workflowfork','runtimefork','replayfork','orchestrationfork','autonomousoptimization','policyexecution','dynamicexecution','uninstalljava','removejava','changeoracleconfig','alterdatabase','migrateworkload','reassignlicense','scanendpoint','deployagent','eval']; dirs.forEach((d)=>{ const body=fs.readdirSync(new URL(d, import.meta.url)).map((n)=>fs.readFileSync(new URL(`${d}${n}`, import.meta.url),'utf8')).join('\n').toLowerCase(); forbidden.forEach((k)=>assert.equal(containsForbiddenTerm(body, k), false));});});


test('governance verification maturity folders enforce forbidden terms',()=>{ const dirs=['../lib/governance-dsl/','../lib/economic-graph-constraints/','../lib/benchmark-realism/','../lib/governance-verification/','../lib/executive-reasoning/']; const forbidden=['kubectl','deletepod','patchdeployment','restartpod','scaledeployment','applymanifest','cloudexecute','executeaws','executeazure','executegcp','agentexecute','modelroute','promptrewrite','gpuschedule','autooptimize','autoremediate','mutate','mutationpayload','workflowfork','runtimefork','replayfork','orchestrationfork','autonomousoptimization','policyexecution','dynamicexecution','uninstalljava','removejava','changeoracleconfig','alterdatabase','migrateworkload','reassignlicense','scanendpoint','deployagent','eval']; dirs.forEach((d)=>{ const body=fs.readdirSync(new URL(d, import.meta.url)).map((n)=>fs.readFileSync(new URL(`${d}${n}`, import.meta.url),'utf8')).join('\n').toLowerCase(); forbidden.forEach((k)=>assert.equal(containsForbiddenTerm(body, k), false));});});


test('new governance maturity folders enforce forbidden terms',()=>{ const dirs=['../lib/governance-precedence/','../lib/evidence-integrity/','../lib/governance-certification/','../lib/enterprise-realism/','../lib/governance-contradictions/','../lib/explainability-citations/']; const forbidden=['kubectl','deletepod','patchdeployment','restartpod','scaledeployment','applymanifest','cloudexecute','executeaws','executeazure','executegcp','agentexecute','modelroute','promptrewrite','gpuschedule','autooptimize','autoremediate','mutate','mutationpayload','workflowfork','runtimefork','replayfork','orchestrationfork','autonomousoptimization','policyexecution','dynamicexecution','uninstalljava','removejava','changeoracleconfig','alterdatabase','migrateworkload','reassignlicense','scanendpoint','deployagent','eval']; dirs.forEach((d)=>{ const body=fs.readdirSync(new URL(d, import.meta.url)).map((n)=>fs.readFileSync(new URL(`${d}${n}`, import.meta.url),'utf8')).join('\n').toLowerCase(); forbidden.forEach((k)=>assert.equal(containsForbiddenTerm(body, k), false));});});
