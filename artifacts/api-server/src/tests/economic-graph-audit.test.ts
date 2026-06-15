import test from "node:test";
import assert from "node:assert/strict";
import { runEconomicGraphFoundationAudit } from "../lib/economic-knowledge-graph/economic-graph-audit";

test("ECONOMIC_GRAPH_FOUNDATION_READY: audit returns PASS or WARN (not FAIL)", async () => {
  const audit = await runEconomicGraphFoundationAudit();
  assert.ok(["PASS", "WARN"].includes(audit.status), `Expected PASS or WARN, got ${audit.status}. Results: ${JSON.stringify(audit.results.filter((r) => r.verdict === "FAIL"), null, 2)}`);
  assert.ok(audit.results.length > 0);
  assert.ok(audit.checkedAt);
});

test("ECONOMIC_GRAPH_FOUNDATION_READY: node and edge collections registered", async () => {
  const audit = await runEconomicGraphFoundationAudit();
  const nodeCheck = audit.results.find((r) => r.check === "node_collection_exists");
  const edgeCheck = audit.results.find((r) => r.check === "edge_collection_exists");
  assert.equal(nodeCheck?.verdict, "PASS");
  assert.equal(edgeCheck?.verdict, "PASS");
});

test("ECONOMIC_GRAPH_FOUNDATION_READY: repository operational", async () => {
  const audit = await runEconomicGraphFoundationAudit();
  const repoCheck = audit.results.find((r) => r.check === "repository_operational");
  assert.equal(repoCheck?.verdict, "PASS");
});

test("ECONOMIC_GRAPH_FOUNDATION_READY: tenant isolation passes", async () => {
  const audit = await runEconomicGraphFoundationAudit();
  const isoCheck = audit.results.find((r) => r.check === "tenant_isolation");
  assert.equal(isoCheck?.verdict, "PASS");
});

test("ECONOMIC_GRAPH_FOUNDATION_READY: node and edge type enums complete", async () => {
  const audit = await runEconomicGraphFoundationAudit();
  const nodeTypes = audit.results.find((r) => r.check === "node_types_complete");
  const edgeTypes = audit.results.find((r) => r.check === "edge_types_complete");
  assert.ok(["PASS", "WARN"].includes(nodeTypes?.verdict ?? "FAIL"));
  assert.ok(["PASS", "WARN"].includes(edgeTypes?.verdict ?? "FAIL"));
});
