import test from "node:test";
import assert from "node:assert/strict";
import { EconomicGraphRepository } from "../lib/economic-knowledge-graph/economic-graph-repository";
import { EconomicGraphService } from "../lib/economic-knowledge-graph/economic-graph-service";
import { EconomicGraphNodeType, EconomicGraphEdgeType } from "../lib/economic-knowledge-graph/economic-knowledge-graph-types";
import type { EconomicGraphNode, EconomicGraphEdge } from "../lib/economic-knowledge-graph/economic-knowledge-graph-types";

function makeRepo() {
  const repo = new EconomicGraphRepository();
  repo.clearAll();
  return repo;
}

function makeSvc(repo: EconomicGraphRepository) {
  return new EconomicGraphService(repo);
}

const ts = () => new Date().toISOString();

function node(overrides: Partial<EconomicGraphNode> = {}): EconomicGraphNode {
  return {
    id: `n-${Math.random()}`, tenantId: "t1", type: EconomicGraphNodeType.VENDOR,
    source: "test", displayName: "Test Node", properties: {}, confidence: 0.9,
    evidenceRefs: ["e1"], createdAt: ts(), updatedAt: ts(), ...overrides,
  };
}

function edge(overrides: Partial<EconomicGraphEdge> = {}): EconomicGraphEdge {
  return {
    id: `edge-${Math.random()}`, tenantId: "t1", fromNodeId: "n1", toNodeId: "n2",
    type: EconomicGraphEdgeType.OWNS, source: "test", confidence: 0.8,
    evidenceRefs: ["ev1"], properties: {}, createdAt: ts(), updatedAt: ts(), ...overrides,
  };
}

// --- Node Tests ---

test("create node: upsert returns the node with tenantId", async () => {
  const repo = makeRepo();
  const n = node({ id: "node-1", tenantId: "tenant-a" });
  const saved = await repo.upsertNode(n);
  assert.equal(saved.id, "node-1");
  assert.equal(saved.tenantId, "tenant-a");
});

test("update node: second upsert with same id merges evidenceRefs and preserves createdAt", async () => {
  const repo = makeRepo();
  const n1 = node({ id: "node-upd", evidenceRefs: ["e1"] });
  await repo.upsertNode(n1);
  const n2 = node({ id: "node-upd", evidenceRefs: ["e2"], displayName: "Updated" });
  const updated = await repo.upsertNode(n2);
  assert.equal(updated.displayName, "Updated");
  assert.ok(updated.evidenceRefs.includes("e1"));
  assert.ok(updated.evidenceRefs.includes("e2"));
  assert.equal(updated.createdAt, n1.createdAt);
});

test("confidence validation: rejects node confidence < 0", async () => {
  const repo = makeRepo();
  await assert.rejects(() => repo.upsertNode(node({ confidence: -0.1 })), /CONFIDENCE/);
});

test("confidence validation: rejects node confidence > 1", async () => {
  const repo = makeRepo();
  await assert.rejects(() => repo.upsertNode(node({ confidence: 1.5 })), /CONFIDENCE/);
});

test("confidence validation: accepts boundary values 0 and 1", async () => {
  const repo = makeRepo();
  const n0 = await repo.upsertNode(node({ id: "conf-0", confidence: 0 }));
  const n1 = await repo.upsertNode(node({ id: "conf-1", confidence: 1 }));
  assert.equal(n0.confidence, 0);
  assert.equal(n1.confidence, 1);
});

test("evidenceRefs preserved across upsert", async () => {
  const repo = makeRepo();
  await repo.upsertNode(node({ id: "ev-node", evidenceRefs: ["ref-a", "ref-b"] }));
  const fetched = await repo.getNode("t1", "ev-node");
  assert.ok(fetched?.evidenceRefs.includes("ref-a"));
  assert.ok(fetched?.evidenceRefs.includes("ref-b"));
});

test("tenant isolation: node in tenant-A not visible in tenant-B", async () => {
  const repo = makeRepo();
  await repo.upsertNode(node({ id: "iso-n1", tenantId: "tenant-A" }));
  const visible = await repo.listNodes("tenant-B");
  assert.equal(visible.filter((n) => n.tenantId === "tenant-A").length, 0);
});

// --- Edge Tests ---

test("create edge: upsert returns edge with correct fields", async () => {
  const repo = makeRepo();
  const e = edge({ id: "edge-1", fromNodeId: "n1", toNodeId: "n2" });
  const { edge: saved, created } = await repo.upsertEdge(e);
  assert.equal(saved.id, "edge-1");
  assert.equal(saved.fromNodeId, "n1");
  assert.equal(saved.toNodeId, "n2");
  assert.equal(created, true);
});

test("update edge: second upsert with same relationship merges evidenceRefs", async () => {
  const repo = makeRepo();
  const e1 = edge({ id: "dup-e1", fromNodeId: "na", toNodeId: "nb", type: EconomicGraphEdgeType.OWNS, evidenceRefs: ["ev1"] });
  const { created: c1 } = await repo.upsertEdge(e1);
  const e2 = edge({ id: "dup-e2", fromNodeId: "na", toNodeId: "nb", type: EconomicGraphEdgeType.OWNS, evidenceRefs: ["ev2"] });
  const { edge: merged, created: c2 } = await repo.upsertEdge(e2);
  assert.equal(c1, true);
  assert.equal(c2, false);
  assert.ok(merged.evidenceRefs.includes("ev1"));
  assert.ok(merged.evidenceRefs.includes("ev2"));
});

test("duplicate edge prevention: same fromNodeId+toNodeId+type returns created=false", async () => {
  const repo = makeRepo();
  await repo.upsertEdge(edge({ id: "e-orig", fromNodeId: "x", toNodeId: "y", type: EconomicGraphEdgeType.FUNDS }));
  const { created } = await repo.upsertEdge(edge({ id: "e-dup", fromNodeId: "x", toNodeId: "y", type: EconomicGraphEdgeType.FUNDS }));
  assert.equal(created, false);
});

test("edge confidence validation: rejects < 0 and > 1", async () => {
  const repo = makeRepo();
  await assert.rejects(() => repo.upsertEdge(edge({ confidence: -0.5 })), /CONFIDENCE/);
  await assert.rejects(() => repo.upsertEdge(edge({ confidence: 2.0 })), /CONFIDENCE/);
});

test("edge tenant isolation: edge in tenant-C not visible in tenant-D", async () => {
  const repo = makeRepo();
  await repo.upsertEdge(edge({ id: "iso-edge", tenantId: "tenant-C", fromNodeId: "a", toNodeId: "b" }));
  const visible = await repo.listEdges("tenant-D");
  assert.equal(visible.filter((e) => e.tenantId === "tenant-C").length, 0);
});

// --- Query Tests ---

test("findNeighbors OUTBOUND: returns nodes connected via outbound edges", async () => {
  const repo = makeRepo();
  const tid = "q-tenant";
  await repo.upsertNode(node({ id: "qn-root", tenantId: tid }));
  await repo.upsertNode(node({ id: "qn-child1", tenantId: tid }));
  await repo.upsertNode(node({ id: "qn-child2", tenantId: tid }));
  await repo.upsertEdge(edge({ id: "qe1", tenantId: tid, fromNodeId: "qn-root", toNodeId: "qn-child1" }));
  await repo.upsertEdge(edge({ id: "qe2", tenantId: tid, fromNodeId: "qn-root", toNodeId: "qn-child2" }));
  const { nodes } = await repo.findNeighbors(tid, "qn-root", "OUTBOUND");
  const ids = nodes.map((n) => n.id);
  assert.ok(ids.includes("qn-child1"));
  assert.ok(ids.includes("qn-child2"));
  assert.ok(!ids.includes("qn-root"));
});

test("findNeighbors INBOUND: returns nodes that point to the target", async () => {
  const repo = makeRepo();
  const tid = "in-tenant";
  await repo.upsertNode(node({ id: "in-parent", tenantId: tid }));
  await repo.upsertNode(node({ id: "in-target", tenantId: tid }));
  await repo.upsertEdge(edge({ id: "in-edge", tenantId: tid, fromNodeId: "in-parent", toNodeId: "in-target" }));
  const { nodes } = await repo.findNeighbors(tid, "in-target", "INBOUND");
  assert.ok(nodes.some((n) => n.id === "in-parent"));
});

test("findNeighbors BOTH: returns all connected nodes regardless of direction", async () => {
  const repo = makeRepo();
  const tid = "both-t";
  await repo.upsertNode(node({ id: "b-center", tenantId: tid }));
  await repo.upsertNode(node({ id: "b-before", tenantId: tid }));
  await repo.upsertNode(node({ id: "b-after", tenantId: tid }));
  await repo.upsertEdge(edge({ id: "be1", tenantId: tid, fromNodeId: "b-before", toNodeId: "b-center" }));
  await repo.upsertEdge(edge({ id: "be2", tenantId: tid, fromNodeId: "b-center", toNodeId: "b-after" }));
  const { nodes } = await repo.findNeighbors(tid, "b-center", "BOTH");
  const ids = nodes.map((n) => n.id);
  assert.ok(ids.includes("b-before"));
  assert.ok(ids.includes("b-after"));
});

test("findPath: returns nodes on shortest path", async () => {
  const repo = makeRepo();
  const tid = "path-t";
  for (const id of ["p-a", "p-b", "p-c"]) await repo.upsertNode(node({ id, tenantId: tid }));
  await repo.upsertEdge(edge({ id: "pe1", tenantId: tid, fromNodeId: "p-a", toNodeId: "p-b" }));
  await repo.upsertEdge(edge({ id: "pe2", tenantId: tid, fromNodeId: "p-b", toNodeId: "p-c" }));
  const path = await repo.findPath(tid, "p-a", "p-c", 5);
  assert.ok(path.length >= 2);
  assert.equal(path[0].id, "p-a");
  assert.equal(path[path.length - 1].id, "p-c");
});

test("findPath: returns empty array when no path exists", async () => {
  const repo = makeRepo();
  const tid = "nopath-t";
  await repo.upsertNode(node({ id: "np-a", tenantId: tid }));
  await repo.upsertNode(node({ id: "np-b", tenantId: tid }));
  const path = await repo.findPath(tid, "np-a", "np-b", 5);
  assert.equal(path.length, 0);
});

test("findPath: max depth enforcement stops traversal", async () => {
  const repo = makeRepo();
  const tid = "depth-t";
  // Chain: d-0 → d-1 → d-2 → d-3 → d-4 → d-5
  for (let i = 0; i <= 5; i++) await repo.upsertNode(node({ id: `d-${i}`, tenantId: tid }));
  for (let i = 0; i < 5; i++) await repo.upsertEdge(edge({ id: `de-${i}`, tenantId: tid, fromNodeId: `d-${i}`, toNodeId: `d-${i + 1}` }));
  // maxDepth=2 should not find d-5 (5 hops away)
  const path = await repo.findPath(tid, "d-0", "d-5", 2);
  assert.equal(path.length, 0);
});

// --- Linking Tests ---

test("linkRecommendationToApproval: creates RECOMMENDATION and APPROVAL nodes and REQUIRES_APPROVAL edge", async () => {
  const repo = makeRepo();
  const svc = makeSvc(repo);
  const tid = "link-t1";
  await svc.linkRecommendationToApproval(tid, "rec-1", "app-1");
  const nodes = await repo.listNodes(tid);
  const edges = await repo.listEdges(tid);
  assert.ok(nodes.some((n) => n.type === EconomicGraphNodeType.RECOMMENDATION));
  assert.ok(nodes.some((n) => n.type === EconomicGraphNodeType.APPROVAL));
  assert.ok(edges.some((e) => e.type === EconomicGraphEdgeType.REQUIRES_APPROVAL));
});

test("linkApprovalToAction: creates APPROVAL and GOVERNED_ACTION nodes and APPROVES edge", async () => {
  const repo = makeRepo();
  const svc = makeSvc(repo);
  const tid = "link-t2";
  await svc.linkApprovalToAction(tid, "app-2", "action-2");
  const edges = await repo.listEdges(tid);
  assert.ok(edges.some((e) => e.type === EconomicGraphEdgeType.APPROVES));
});

test("linkActionToExecution: creates GOVERNED_ACTION and EXECUTION nodes and EXECUTES edge", async () => {
  const repo = makeRepo();
  const svc = makeSvc(repo);
  const tid = "link-t3";
  await svc.linkActionToExecution(tid, "action-3", "exec-3");
  const edges = await repo.listEdges(tid);
  assert.ok(edges.some((e) => e.type === EconomicGraphEdgeType.EXECUTES));
});

test("linkExecutionToEvidence: creates EXECUTION and EVIDENCE_PACK nodes and SUPPORTED_BY_EVIDENCE edge", async () => {
  const repo = makeRepo();
  const svc = makeSvc(repo);
  const tid = "link-t4";
  await svc.linkExecutionToEvidence(tid, "exec-4", "ev-4");
  const edges = await repo.listEdges(tid);
  assert.ok(edges.some((e) => e.type === EconomicGraphEdgeType.SUPPORTED_BY_EVIDENCE));
});

test("linkEvidenceToOutcome: creates EVIDENCE_PACK and OUTCOME_EVENT nodes and VERIFIES edge", async () => {
  const repo = makeRepo();
  const svc = makeSvc(repo);
  const tid = "link-t5";
  await svc.linkEvidenceToOutcome(tid, "ev-5", "out-5");
  const edges = await repo.listEdges(tid);
  assert.ok(edges.some((e) => e.type === EconomicGraphEdgeType.VERIFIES));
});

test("linkRecommendationToOutcome: creates RECOMMENDATION and OUTCOME_EVENT nodes and TARGETS edge", async () => {
  const repo = makeRepo();
  const svc = makeSvc(repo);
  const tid = "link-t6";
  await svc.linkRecommendationToOutcome(tid, "rec-6", "out-6");
  const edges = await repo.listEdges(tid);
  assert.ok(edges.some((e) => e.type === EconomicGraphEdgeType.TARGETS));
});

// --- Resilience Tests ---

test("graph write failure: authority write still succeeds when graph throws", async () => {
  // Create a broken repo that throws on upsert
  const brokenRepo = makeRepo();
  const originalUpsert = brokenRepo.upsertNode.bind(brokenRepo);
  brokenRepo.upsertNode = async () => { throw new Error("SIMULATED_GRAPH_FAILURE"); };

  const svc = makeSvc(brokenRepo);
  const errors: string[] = [];

  // Simulate what approval-authority-service does: non-breaking fire-and-forget
  let authorityWriteSucceeded = false;
  const doAuthorityWrite = async () => { authorityWriteSucceeded = true; return { ok: true }; };
  const doGraphHook = () => svc.linkRecommendationToApproval("t", "rec", "app").catch((err) => { errors.push(err.message); });

  await doAuthorityWrite();
  await doGraphHook();

  assert.equal(authorityWriteSucceeded, true);
  assert.ok(errors.some((e) => e.includes("SIMULATED_GRAPH_FAILURE")));
});

test("graph write failure: error is captured and not silently lost", async () => {
  const failures: string[] = [];
  const brokenRepo = makeRepo();
  brokenRepo.upsertNode = async () => { throw new Error("GRAPH_DB_UNAVAILABLE"); };
  const svc = makeSvc(brokenRepo);

  await svc.linkRecommendationToApproval("t", "rec", "app").catch((err) => failures.push(err.message));
  assert.ok(failures.length > 0, "Graph failure must be captured, not silently lost");
  assert.ok(failures[0].includes("GRAPH_DB_UNAVAILABLE"));
});

// --- Cleanup Tests ---

test("deleteTenantGraph: removes all nodes and edges for the tenant", async () => {
  const repo = makeRepo();
  const tid = "cleanup-t";
  await repo.upsertNode(node({ id: "c-n1", tenantId: tid }));
  await repo.upsertNode(node({ id: "c-n2", tenantId: tid }));
  await repo.upsertEdge(edge({ id: "c-e1", tenantId: tid, fromNodeId: "c-n1", toNodeId: "c-n2" }));
  await repo.deleteTenantGraph(tid);
  const nodesAfter = await repo.listNodes(tid);
  const edgesAfter = await repo.listEdges(tid);
  assert.equal(nodesAfter.length, 0);
  assert.equal(edgesAfter.length, 0);
});

test("deleteTenantGraph: does not affect other tenants", async () => {
  const repo = makeRepo();
  await repo.upsertNode(node({ id: "keep-n1", tenantId: "keep-tenant" }));
  await repo.upsertNode(node({ id: "del-n1", tenantId: "del-tenant" }));
  await repo.deleteTenantGraph("del-tenant");
  const kept = await repo.listNodes("keep-tenant");
  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, "keep-n1");
});
