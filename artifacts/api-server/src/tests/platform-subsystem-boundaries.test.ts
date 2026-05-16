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

test("subsystem boundaries: support diagnostics and ui/backend mapping docs exist", () => {
  const pilotRoute = read("../routes/pilot.ts");
  const contracts = read("../../../../docs/architecture/subsystem-boundary-contracts.md");
  assert.equal(pilotRoute.includes("support/diagnostics"), true);
  assert.equal(contracts.includes("Route authority"), true);
});
