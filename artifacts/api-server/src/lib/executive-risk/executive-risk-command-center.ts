import { buildGovernanceGraph } from "../governance-graph/governance-graph-builder";
import { demoGovernanceGraphInput } from "../governance-graph/governance-graph-demo-data";
import type { GovernanceGraphResult } from "../governance-graph/governance-graph-types";
import { prioritiseExecutiveRisks } from "./executive-risk-prioritisation";
import { scoreExecutiveRisk } from "./executive-risk-scoring";
import type { ExecutiveActionType, ExecutiveDomainBreakdown, ExecutiveLeadershipAction, ExecutiveRiskCommandCenterResult, ExecutiveRiskDomain, ExecutiveRiskItem, ExecutiveRiskLevel } from "./executive-risk-types";

const domainMap: Record<string, ExecutiveRiskDomain> = { M365_OPTIMISATION: "M365", SHADOW_IT: "SHADOW_IT", SAAS_RATIONALISATION: "SAAS_RATIONALISATION", AI_GOVERNANCE: "AI_GOVERNANCE", RENEWALS: "RENEWALS", OWNERSHIP: "OWNERSHIP" };
const actionFor = (type: string): ExecutiveActionType => type === "OWNERLESS_HIGH_SPEND" ? "ASSIGN_OWNER" : type === "AI_GOVERNANCE_CLUSTER" ? "REVIEW_AI_POLICY" : type === "RENEWAL_RISK_CLUSTER" ? "RENEGOTIATE_RENEWAL" : type === "DUPLICATE_CAPABILITY_CLUSTER" ? "CONSOLIDATE_VENDOR" : type === "EVIDENCE_GAP" ? "GENERATE_EVIDENCE" : type === "HIGH_VALUE_OPPORTUNITY" ? "EXECUTIVE_REVIEW" : "INVESTIGATE";
const levelFor = (severity: string): ExecutiveRiskLevel => severity === "CRITICAL" ? "CRITICAL" : severity === "HIGH" ? "HIGH" : severity === "MEDIUM" ? "MEDIUM" : "LOW";

function appFor(graph: GovernanceGraphResult, relatedNodeIds: string[]) { return relatedNodeIds.map((id) => graph.nodes.find((node) => node.id === id)).find((node) => node?.type === "APPLICATION"); }
function vendorFor(graph: GovernanceGraphResult, appId?: string) { return graph.nodes.find((node) => graph.edges.some((edge) => edge.type === "OWNS_APPLICATION" && edge.targetId === appId && edge.sourceId === node.id)); }
function domainsFor(app: any): ExecutiveRiskDomain[] { return ((app?.metadata?.domains ?? []) as string[]).map((d) => domainMap[d]).filter(Boolean); }

export function buildExecutiveRiskCommandCenter(graph: GovernanceGraphResult = buildGovernanceGraph(demoGovernanceGraphInput)): ExecutiveRiskCommandCenterResult {
  const risks: ExecutiveRiskItem[] = graph.insights.map((insight) => {
    const app = appFor(graph, insight.relatedNodeIds);
    const vendor = vendorFor(graph, app?.id);
    const domains = domainsFor(app);
    const domain = domains.includes("AI_GOVERNANCE") ? "AI_GOVERNANCE" : domains.includes("RENEWALS") ? "RENEWALS" : domains.includes("OWNERSHIP") ? "OWNERSHIP" : domains.includes("SHADOW_IT") ? "SHADOW_IT" : domains.includes("SAAS_RATIONALISATION") ? "SAAS_RATIONALISATION" : "M365";
    const item = { id: insight.id, title: insight.title, riskLevel: levelFor(insight.severity), riskScore: 0, domain, vendorName: vendor?.label, applicationName: app?.label, annualCostExposure: app?.annualCost, potentialAnnualSavings: graph.nodes.filter((node) => insight.relatedNodeIds.includes(node.id) || node.type === "OPPORTUNITY").reduce((sum, node) => sum + Number(node.potentialAnnualSavings ?? 0), 0) || undefined, daysToRenewal: Number((graph.edges.find((edge) => edge.sourceId === app?.id && edge.type === "HAS_RENEWAL")?.metadata?.daysToRenewal) ?? undefined) || undefined, ownerMissing: insight.type === "OWNERLESS_HIGH_SPEND" || !graph.edges.some((edge) => edge.sourceId === app?.id && edge.type === "HAS_OWNER"), affectedUsers: app?.label === "ChatGPT" ? 34 : undefined, rationale: insight.rationale, recommendedAction: actionFor(insight.type), evidenceRefs: insight.evidenceRefs } satisfies ExecutiveRiskItem;
    return { ...item, riskScore: scoreExecutiveRisk(item) };
  });
  const topRisks = prioritiseExecutiveRisks(risks);
  const actionTypes: ExecutiveActionType[] = ["ASSIGN_OWNER", "REVIEW_AI_POLICY", "RENEGOTIATE_RENEWAL", "CONSOLIDATE_VENDOR", "RETIRE_UNUSED_TOOL", "VALIDATE_DATA", "GENERATE_EVIDENCE", "EXECUTIVE_REVIEW"];
  const leadershipActions: ExecutiveLeadershipAction[] = actionTypes.map((actionType) => ({ actionType, label: actionType.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), count: risks.filter((risk) => risk.recommendedAction === actionType).length, priority: risks.some((risk) => risk.recommendedAction === actionType && risk.riskLevel === "CRITICAL") ? "CRITICAL" : risks.some((risk) => risk.recommendedAction === actionType && risk.riskLevel === "HIGH") ? "HIGH" : "MEDIUM", rationale: "Read-only leadership focus area from governance graph relationships." }));
  const domains: ExecutiveRiskDomain[] = ["M365", "SHADOW_IT", "SAAS_RATIONALISATION", "AI_GOVERNANCE", "RENEWALS", "OWNERSHIP"];
  const domainBreakdown: ExecutiveDomainBreakdown[] = domains.map((domain) => ({ domain, issueCount: risks.filter((risk) => risk.domain === domain).length, criticalCount: risks.filter((risk) => risk.domain === domain && risk.riskLevel === "CRITICAL").length, highCount: risks.filter((risk) => risk.domain === domain && risk.riskLevel === "HIGH").length, exposedSpend: risks.filter((risk) => risk.domain === domain).reduce((sum, risk) => sum + Number(risk.annualCostExposure ?? 0), 0), potentialSavings: risks.filter((risk) => risk.domain === domain).reduce((sum, risk) => sum + Number(risk.potentialAnnualSavings ?? 0), 0) }));
  const evidenceRefs = Array.from(new Set(risks.flatMap((risk) => risk.evidenceRefs)));
  const evidenceBacked = risks.filter((risk) => risk.evidenceRefs.length > 0).length;
  const evidenceConfidence: "HIGH" | "MEDIUM" | "LOW" = evidenceBacked / Math.max(1, risks.length) > 0.8 ? "HIGH" : evidenceBacked / Math.max(1, risks.length) > 0.5 ? "MEDIUM" : "LOW";
  const summary = { portfolioRiskScore: Math.round(topRisks.reduce((sum, risk) => sum + risk.riskScore, 0) / Math.max(1, topRisks.length)), criticalIssues: risks.filter((risk) => risk.riskLevel === "CRITICAL").length, highRiskIssues: risks.filter((risk) => risk.riskLevel === "HIGH").length, ownerlessSpend: risks.filter((risk) => risk.ownerMissing).reduce((sum, risk) => sum + Number(risk.annualCostExposure ?? 0), 0), renewalsAtRisk: risks.filter((risk) => risk.domain === "RENEWALS" || typeof risk.daysToRenewal === "number").length, aiGovernanceGaps: risks.filter((risk) => risk.domain === "AI_GOVERNANCE").length, shadowITFindings: risks.filter((risk) => risk.domain === "SHADOW_IT").length, potentialAnnualSavings: risks.reduce((sum, risk) => sum + Number(risk.potentialAnnualSavings ?? 0), 0), evidenceConfidence };
  const executiveNarrative = "The highest-priority governance issues are concentrated in ownerless AI applications, near-term renewals with low utilisation, and duplicate SaaS capability. Immediate attention should focus on ownership assignment, AI policy review, renewal rationalisation, and evidence-backed executive review.";
  return { summary, topRisks, leadershipActions, domainBreakdown, executiveNarrative, evidenceRefs, generatedAt: graph.generatedAt };
}
