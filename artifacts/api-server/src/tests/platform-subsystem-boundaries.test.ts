import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

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
