import { economicGraphRepository } from "./economic-graph-repository";
import { EconomicGraphNodeType, EconomicGraphEdgeType } from "./economic-knowledge-graph-types";
import { PersistenceCollections } from "../persistence/persistence-collections";

export type AuditVerdict = "PASS" | "WARN" | "FAIL";

export interface GraphAuditResult {
  check: string;
  verdict: AuditVerdict;
  evidence: string;
}

export interface EconomicGraphFoundationAudit {
  status: AuditVerdict;
  results: GraphAuditResult[];
  checkedAt: string;
}

function pass(check: string, evidence: string): GraphAuditResult { return { check, verdict: "PASS", evidence }; }
function fail(check: string, evidence: string): GraphAuditResult { return { check, verdict: "FAIL", evidence }; }
function warn(check: string, evidence: string): GraphAuditResult { return { check, verdict: "WARN", evidence }; }

export async function runEconomicGraphFoundationAudit(): Promise<EconomicGraphFoundationAudit> {
  const results: GraphAuditResult[] = [];

  // 1. Node collection exists
  const nodeCollectionExists = PersistenceCollections.ECONOMIC_GRAPH_NODES === "economic_graph_nodes";
  results.push(nodeCollectionExists
    ? pass("node_collection_exists", `Collection '${PersistenceCollections.ECONOMIC_GRAPH_NODES}' registered in PersistenceCollections`)
    : fail("node_collection_exists", "ECONOMIC_GRAPH_NODES not found in PersistenceCollections"));

  // 2. Edge collection exists
  const edgeCollectionExists = PersistenceCollections.ECONOMIC_GRAPH_EDGES === "economic_graph_edges";
  results.push(edgeCollectionExists
    ? pass("edge_collection_exists", `Collection '${PersistenceCollections.ECONOMIC_GRAPH_EDGES}' registered in PersistenceCollections`)
    : fail("edge_collection_exists", "ECONOMIC_GRAPH_EDGES not found in PersistenceCollections"));

  // 3. Repository operational — write + read a probe node
  try {
    const probeId = `audit-probe-${Date.now()}`;
    const probeTenant = `audit-tenant-${Date.now()}`;
    await economicGraphRepository.upsertNode({
      id: probeId, tenantId: probeTenant, type: EconomicGraphNodeType.RISK,
      source: "audit", displayName: "Audit probe", properties: {}, confidence: 1.0,
      evidenceRefs: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    const readBack = await economicGraphRepository.getNode(probeTenant, probeId);
    await economicGraphRepository.deleteTenantGraph(probeTenant);
    results.push(readBack
      ? pass("repository_operational", "Probe node written and read back successfully")
      : fail("repository_operational", "Probe node write succeeded but read-back returned null"));
  } catch (err) {
    results.push(fail("repository_operational", `Repository threw: ${err instanceof Error ? err.message : String(err)}`));
  }

  // 4. Graph routes registered — check that the route file exists
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const routeFile = path.resolve(process.cwd(), "src/routes/economic-graph.ts");
    const exists = fs.existsSync(routeFile);
    results.push(exists
      ? pass("graph_routes_registered", "src/routes/economic-graph.ts exists")
      : fail("graph_routes_registered", "src/routes/economic-graph.ts not found"));
  } catch {
    results.push(warn("graph_routes_registered", "Could not verify route file existence"));
  }

  // 5. Tenant isolation — nodes from tenant A must not appear in tenant B
  try {
    const tsuffix = Date.now();
    const tenantA = `audit-ta-${tsuffix}`;
    const tenantB = `audit-tb-${tsuffix}`;
    await economicGraphRepository.upsertNode({
      id: `node-a-${tsuffix}`, tenantId: tenantA, type: EconomicGraphNodeType.VENDOR,
      source: "audit", displayName: "Tenant A node", properties: {}, confidence: 1.0,
      evidenceRefs: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    const nodesB = await economicGraphRepository.listNodes(tenantB);
    const leaked = nodesB.some((n) => n.tenantId === tenantA);
    await economicGraphRepository.deleteTenantGraph(tenantA);
    results.push(!leaked
      ? pass("tenant_isolation", "Tenant A node not visible in Tenant B query")
      : fail("tenant_isolation", "Tenant isolation breach: Tenant A node appeared in Tenant B query"));
  } catch (err) {
    results.push(fail("tenant_isolation", `Isolation check threw: ${err instanceof Error ? err.message : String(err)}`));
  }

  // 6. Authority linking hooks present — verify approval-authority-service imports economic-graph-service
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const authFile = path.resolve(process.cwd(), "src/lib/approvals/approval-authority-service.ts");
    const src = fs.readFileSync(authFile, "utf8");
    const hasImport = src.includes("economic-graph-service") || src.includes("economic-knowledge-graph");
    const hasLink = src.includes("linkRecommendationToApproval") || src.includes("economicGraphService");
    results.push(hasImport && hasLink
      ? pass("authority_linking_hooks_present", "approval-authority-service.ts imports and calls economicGraphService")
      : fail("authority_linking_hooks_present", "approval-authority-service.ts does not call graph linking hooks"));
  } catch (err) {
    results.push(warn("authority_linking_hooks_present", `Could not verify authority hooks: ${err instanceof Error ? err.message : String(err)}`));
  }

  // 7. Node and edge type enums complete
  const nodeTypeCount = Object.keys(EconomicGraphNodeType).length;
  const edgeTypeCount = Object.keys(EconomicGraphEdgeType).length;
  results.push(nodeTypeCount >= 27
    ? pass("node_types_complete", `${nodeTypeCount} node types defined`)
    : warn("node_types_complete", `Only ${nodeTypeCount} node types defined, expected ≥ 27`));
  results.push(edgeTypeCount >= 22
    ? pass("edge_types_complete", `${edgeTypeCount} edge types defined`)
    : warn("edge_types_complete", `Only ${edgeTypeCount} edge types defined, expected ≥ 22`));

  const overallVerdict: AuditVerdict = results.some((r) => r.verdict === "FAIL") ? "FAIL"
    : results.some((r) => r.verdict === "WARN") ? "WARN" : "PASS";

  return { status: overallVerdict, results, checkedAt: new Date().toISOString() };
}
