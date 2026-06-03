import { demoGovernanceGraphInput } from "./governance-graph-demo-data";
import { generateGovernanceGraphInsights } from "./governance-graph-insights";
import type { GovernanceGraphDomain, GovernanceGraphEdge, GovernanceGraphEdgeType, GovernanceGraphInput, GovernanceGraphNode, GovernanceGraphNodeType, GovernanceGraphResult } from "./governance-graph-types";

const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const nodeId = (type: GovernanceGraphNodeType, value: string) => `${type.toLowerCase()}:${key(value)}`;
const edgeId = (type: GovernanceGraphEdgeType, sourceId: string, targetId: string) => `${type.toLowerCase()}:${sourceId}:${targetId}`;

export function buildGovernanceGraph(input: GovernanceGraphInput = demoGovernanceGraphInput): GovernanceGraphResult {
  const nodes = new Map<string, GovernanceGraphNode>();
  const edges = new Map<string, GovernanceGraphEdge>();
  const addNode = (node: GovernanceGraphNode) => nodes.set(node.id, { ...(nodes.get(node.id) ?? {}), ...node, metadata: { ...(nodes.get(node.id)?.metadata ?? {}), ...(node.metadata ?? {}) } });
  const addEdge = (edge: GovernanceGraphEdge) => edges.set(edge.id, edge);
  const domainNode = (domain: GovernanceGraphDomain) => { const id = nodeId("DOMAIN", domain); addNode({ id, type: "DOMAIN", label: domain, domain }); return id; };

  for (const app of input.applications) {
    const vendorId = nodeId("VENDOR", app.vendorName);
    const appId = nodeId("APPLICATION", app.applicationName);
    addNode({ id: vendorId, type: "VENDOR", label: app.vendorName });
    addNode({ id: appId, type: "APPLICATION", label: app.applicationName, annualCost: app.annualCost, riskLevel: app.findings?.some((finding) => finding.riskLevel === "HIGH" || finding.riskLevel === "CRITICAL") ? "HIGH" : undefined, metadata: { domains: app.domains, renewalDate: app.renewalDate } });
    addEdge({ id: edgeId("OWNS_APPLICATION", vendorId, appId), sourceId: vendorId, targetId: appId, type: "OWNS_APPLICATION", label: "owns application" });
    if (app.ownerName) { const ownerId = nodeId("OWNER", app.ownerName); addNode({ id: ownerId, type: "OWNER", label: app.ownerName }); addEdge({ id: edgeId("HAS_OWNER", appId, ownerId), sourceId: appId, targetId: ownerId, type: "HAS_OWNER", label: "has owner" }); }
    if (typeof app.annualCost === "number") { const costId = `cost:${key(app.applicationName)}`; addNode({ id: costId, type: "COST", label: `${app.applicationName} annual cost`, annualCost: app.annualCost }); addEdge({ id: edgeId("HAS_COST", appId, costId), sourceId: appId, targetId: costId, type: "HAS_COST", label: "has cost" }); }
    if (app.renewalDate) { const renewalId = `renewal:${key(app.applicationName)}`; addNode({ id: renewalId, type: "RENEWAL", label: `${app.applicationName} renewal`, metadata: { renewalDate: app.renewalDate } }); addEdge({ id: edgeId("HAS_RENEWAL", appId, renewalId), sourceId: appId, targetId: renewalId, type: "HAS_RENEWAL", label: "has renewal", metadata: { renewalDate: app.renewalDate, daysToRenewal: app.findings?.find((finding) => finding.renewalDays)?.renewalDays } }); }
    for (const domain of app.domains) addEdge({ id: edgeId("SOURCED_FROM_DOMAIN", appId, domainNode(domain)), sourceId: appId, targetId: domainNode(domain), type: "SOURCED_FROM_DOMAIN", label: "sourced from domain" });
    for (const ref of app.evidenceRefs ?? []) { const evidenceId = nodeId("EVIDENCE", ref); addNode({ id: evidenceId, type: "EVIDENCE", label: ref }); addEdge({ id: edgeId("SUPPORTED_BY_EVIDENCE", appId, evidenceId), sourceId: appId, targetId: evidenceId, type: "SUPPORTED_BY_EVIDENCE", label: "supported by evidence" }); }
    for (const target of app.duplicateWith ?? []) addEdge({ id: edgeId("DUPLICATES", appId, nodeId("APPLICATION", target)), sourceId: appId, targetId: nodeId("APPLICATION", target), type: "DUPLICATES", label: "duplicates" });
    for (const target of app.overlapWith ?? []) addEdge({ id: edgeId("OVERLAPS_WITH", appId, nodeId("APPLICATION", target)), sourceId: appId, targetId: nodeId("APPLICATION", target), type: "OVERLAPS_WITH", label: "overlaps with" });
    for (const finding of app.findings ?? []) {
      const findingId = `finding:${finding.sourceDomain.toLowerCase()}:${key(finding.id)}`;
      addNode({ id: findingId, type: "FINDING", label: finding.title, domain: finding.sourceDomain, riskLevel: finding.riskLevel, potentialAnnualSavings: finding.potentialAnnualSavings, metadata: { sourceFindingId: finding.id } });
      addEdge({ id: edgeId("HAS_FINDING", appId, findingId), sourceId: appId, targetId: findingId, type: "HAS_FINDING", label: "has finding" });
      const riskId = `risk:${key(finding.id)}`; addNode({ id: riskId, type: "RISK", label: `${finding.title} risk`, riskLevel: finding.riskLevel }); addEdge({ id: edgeId("HAS_RISK", findingId, riskId), sourceId: findingId, targetId: riskId, type: "HAS_RISK", label: "has risk" });
      if (finding.potentialAnnualSavings) { const oppId = `opportunity:${key(finding.id)}`; addNode({ id: oppId, type: "OPPORTUNITY", label: `${finding.title} opportunity`, potentialAnnualSavings: finding.potentialAnnualSavings }); addEdge({ id: edgeId("HAS_OPPORTUNITY", findingId, oppId), sourceId: findingId, targetId: oppId, type: "HAS_OPPORTUNITY", label: "has opportunity" }); }
      addEdge({ id: edgeId("SOURCED_FROM_DOMAIN", findingId, domainNode(finding.sourceDomain)), sourceId: findingId, targetId: domainNode(finding.sourceDomain), type: "SOURCED_FROM_DOMAIN", label: "sourced from domain" });
      for (const ref of finding.evidenceRefs ?? []) { const evidenceId = nodeId("EVIDENCE", ref); addNode({ id: evidenceId, type: "EVIDENCE", label: ref }); addEdge({ id: edgeId("SUPPORTED_BY_EVIDENCE", findingId, evidenceId), sourceId: findingId, targetId: evidenceId, type: "SUPPORTED_BY_EVIDENCE", label: "supported by evidence" }); }
      for (const target of finding.duplicateWith ?? []) addEdge({ id: edgeId("DUPLICATES", appId, nodeId("APPLICATION", target)), sourceId: appId, targetId: nodeId("APPLICATION", target), type: "DUPLICATES", label: "duplicates" });
      for (const target of finding.overlapWith ?? []) addEdge({ id: edgeId("OVERLAPS_WITH", appId, nodeId("APPLICATION", target)), sourceId: appId, targetId: nodeId("APPLICATION", target), type: "OVERLAPS_WITH", label: "overlaps with" });
    }
  }
  const nodeList = Array.from(nodes.values());
  const edgeList = Array.from(edges.values());
  const domainsRepresented = Array.from(new Set(nodeList.map((node) => node.domain).filter(Boolean))) as GovernanceGraphDomain[];
  const ownerlessApplications = nodeList.filter((node) => node.type === "APPLICATION" && !edgeList.some((edge) => edge.sourceId === node.id && edge.type === "HAS_OWNER")).length;
  const summary = { vendors: nodeList.filter((n) => n.type === "VENDOR").length, applications: nodeList.filter((n) => n.type === "APPLICATION").length, owners: nodeList.filter((n) => n.type === "OWNER").length, findings: nodeList.filter((n) => n.type === "FINDING").length, risks: nodeList.filter((n) => n.type === "RISK").length, opportunities: nodeList.filter((n) => n.type === "OPPORTUNITY").length, evidenceItems: nodeList.filter((n) => n.type === "EVIDENCE").length, ownerlessApplications, highRiskApplications: nodeList.filter((node) => node.type === "APPLICATION" && node.riskLevel === "HIGH").length, annualCostMapped: nodeList.filter((n) => n.type === "APPLICATION").reduce((sum, node) => sum + Number(node.annualCost ?? 0), 0), potentialAnnualSavingsMapped: nodeList.reduce((sum, node) => sum + Number(node.potentialAnnualSavings ?? 0), 0), domainsRepresented };
  return { nodes: nodeList, edges: edgeList, summary, insights: generateGovernanceGraphInsights(nodeList, edgeList), generatedAt: input.generatedAt ?? new Date().toISOString() };
}
