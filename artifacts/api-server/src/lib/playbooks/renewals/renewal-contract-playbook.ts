import { generateRenewalContractOpportunity } from "./renewal-contract-opportunity-provider";
import { scoreRenewalContractTrust } from "./renewal-contract-trust";
import type { RenewalContractDiscoveryInput, RenewalContractInput, RenewalContractResult, RenewalFinding, RenewalFindingType, RenewalRecommendation, RenewalRiskLevel } from "./renewal-contract-types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
export const daysUntil = (date: string | undefined, asOf: Date) => date ? Math.ceil((new Date(`${date}T00:00:00.000Z`).getTime() - asOf.getTime()) / DAY_MS) : undefined;
const utilisation = (contract: RenewalContractInput) => typeof contract.utilisationRate === "number" ? contract.utilisationRate : contract.assignedUsers ? Number(((contract.activeUsers ?? 0) / contract.assignedUsers).toFixed(2)) : undefined;

export function buildDemoRenewalContractInput(asOfDate = new Date().toISOString()): RenewalContractDiscoveryInput {
  const asOf = new Date(asOfDate);
  return { tenantId: "demo-renewal-contract-tenant", asOfDate: asOf.toISOString(), contracts: [
    { id: "renewal-slack", vendorName: "Slack", applicationName: "Slack", capabilityCategory: "Communication", owner: "engineering@example.com", annualCost: 180000, assignedUsers: 440, activeUsers: 180, utilisationRate: 0.41, renewalDate: addDays(asOf, 45), duplicateWith: ["Microsoft Teams"], evidenceRefs: ["contract:slack", "usage:slack", "renewal:slack"] },
    { id: "renewal-zoom", vendorName: "Zoom", applicationName: "Zoom", capabilityCategory: "Communication", owner: "it@example.com", annualCost: 95000, assignedUsers: 300, activeUsers: 144, utilisationRate: 0.48, renewalDate: addDays(asOf, 60), duplicateWith: ["Microsoft Teams"], evidenceRefs: ["contract:zoom", "usage:zoom", "renewal:zoom"] },
    { id: "renewal-tableau", vendorName: "Tableau", applicationName: "Tableau", capabilityCategory: "Analytics", owner: "data@example.com", annualCost: 140000, assignedUsers: 220, activeUsers: 64, utilisationRate: 0.29, renewalDate: addDays(asOf, 87), duplicateWith: ["Power BI"], evidenceRefs: ["contract:tableau", "usage:tableau", "renewal:tableau"] },
    { id: "renewal-dropbox", vendorName: "Dropbox", applicationName: "Dropbox", capabilityCategory: "Storage", owner: "finance-ops@example.com", annualCost: 52000, assignedUsers: 150, activeUsers: 27, utilisationRate: 0.18, renewalDate: addDays(asOf, 110), duplicateWith: ["OneDrive"], evidenceRefs: ["contract:dropbox", "usage:dropbox", "renewal:dropbox"] },
    { id: "renewal-figma", vendorName: "Figma", applicationName: "Figma", capabilityCategory: "Design", owner: "design@example.com", annualCost: 72000, assignedUsers: 130, activeUsers: 86, utilisationRate: 0.66, renewalDate: addDays(asOf, 135), duplicateWith: ["Canva"], evidenceRefs: ["contract:figma", "usage:figma", "renewal:figma"] },
    { id: "renewal-hubspot", vendorName: "HubSpot", applicationName: "HubSpot", capabilityCategory: "CRM", owner: "revenue@example.com", annualCost: 120000, assignedUsers: 160, activeUsers: 86, utilisationRate: 0.54, renewalDate: addDays(asOf, 75), duplicateWith: ["Salesforce"], evidenceRefs: ["contract:hubspot", "usage:hubspot", "renewal:hubspot"] },
    { id: "renewal-miro", vendorName: "Miro", applicationName: "Miro", capabilityCategory: "Collaboration", owner: "product@example.com", annualCost: 38000, assignedUsers: 90, activeUsers: 20, utilisationRate: 0.22, renewalDate: addDays(asOf, 160), duplicateWith: ["Lucid"], evidenceRefs: ["contract:miro", "usage:miro", "renewal:miro"] },
    { id: "renewal-claude", vendorName: "Anthropic", applicationName: "Claude", capabilityCategory: "AI Productivity", annualCost: 24000, assignedUsers: 70, activeUsers: 49, utilisationRate: 0.7, evidenceRefs: ["contract:claude", "usage:claude"] },
    { id: "renewal-box", vendorName: "Box", applicationName: "Box", capabilityCategory: "Storage", owner: "legal@example.com", annualCost: 60000, renewalDate: addDays(asOf, 95), evidenceRefs: ["contract:box", "renewal:box"] },
  ] };
}
export const demoRenewalContractInput = buildDemoRenewalContractInput();

function makeFinding(contract: RenewalContractInput, input: RenewalContractDiscoveryInput, findingType: RenewalFindingType, riskLevel: RenewalRiskLevel, recommendation: RenewalRecommendation, rationale: string, recommendedAction: string, potentialAnnualSavings?: number): RenewalFinding {
  const util = utilisation(contract);
  const evidenceRefs = contract.evidenceRefs ?? [];
  const trust = scoreRenewalContractTrust({ ownerKnown: Boolean(contract.owner), renewalDateKnown: Boolean(contract.renewalDate), annualCostKnown: typeof contract.annualCost === "number", assignedUsersKnown: typeof contract.assignedUsers === "number", activeUsersKnown: typeof contract.activeUsers === "number", utilisationKnown: typeof util === "number", duplicateDataKnown: Array.isArray(contract.duplicateWith), evidenceRefsAvailable: evidenceRefs.length > 0 });
  return { id: `${contract.id}-${findingType.toLowerCase()}`, vendorName: contract.vendorName, applicationName: contract.applicationName, findingType, riskLevel, recommendation, renewalDate: contract.renewalDate, daysToRenewal: daysUntil(contract.renewalDate, new Date(input.asOfDate ?? new Date().toISOString())), annualCost: contract.annualCost, assignedUsers: contract.assignedUsers, activeUsers: contract.activeUsers, utilisationRate: util, owner: contract.owner, duplicateWith: contract.duplicateWith, potentialAnnualSavings, trustScore: trust.trustScore, rationale, recommendedAction, evidenceRefs };
}

const add = (list: RenewalFinding[], finding: RenewalFinding) => list.push(finding);

export function runRenewalContractPlaybook(input: RenewalContractDiscoveryInput = demoRenewalContractInput): RenewalContractResult {
  const findings: RenewalFinding[] = [];
  for (const contract of input.contracts) {
    const days = daysUntil(contract.renewalDate, new Date(input.asOfDate ?? new Date().toISOString()));
    const util = utilisation(contract);
    const duplicate = (contract.duplicateWith ?? []).length > 0;
    if (typeof days === "number" && days >= 0 && days <= 120) add(findings, makeFinding(contract, input, "UPCOMING_RENEWAL", "MEDIUM", "INVESTIGATE", `${contract.vendorName} renews in ${days} days.`, "Review renewal options before commitment."));
    if ((contract.annualCost ?? 0) > 25000 && typeof util === "number" && util < 0.5) add(findings, makeFinding(contract, input, "HIGH_COST_LOW_USAGE_RENEWAL", "HIGH", "REDUCE", `${contract.vendorName} has high annual cost and low utilisation.`, "Reduce seats or renegotiate commercial terms.", Math.round((contract.annualCost ?? 0) * 0.25)));
    if (duplicate && typeof days === "number" && days >= 0 && days <= 180) add(findings, makeFinding(contract, input, "DUPLICATE_VENDOR_RENEWAL", "HIGH", "CONSOLIDATE", `${contract.vendorName} overlaps with ${contract.duplicateWith?.join(", ")} before renewal.`, "Review duplicate vendor renewal and consolidate where practical.", typeof contract.annualCost === "number" ? Math.round(contract.annualCost * 0.3) : undefined));
    if (!contract.owner) add(findings, makeFinding(contract, input, "OWNER_GAP", "HIGH", "INVESTIGATE", `${contract.vendorName} has no contract owner recorded.`, "Assign contract owner before renewal decision."));
    if (typeof contract.assignedUsers !== "number" || typeof contract.activeUsers !== "number") add(findings, makeFinding(contract, input, "MISSING_USAGE_DATA", "MEDIUM", "INVESTIGATE", `${contract.vendorName} is missing assigned or active user data.`, "Validate missing usage data before renewal."));
    if (typeof contract.annualCost !== "number") add(findings, makeFinding(contract, input, "MISSING_COST_DATA", "MEDIUM", "INVESTIGATE", `${contract.vendorName} is missing annual cost data.`, "Validate missing cost data before renewal."));
    if (typeof days === "number" && days >= 0 && days <= 90 && typeof contract.annualCost === "number" && typeof util === "number" && util < 0.75) add(findings, makeFinding(contract, input, "NEGOTIATION_OPPORTUNITY", "MEDIUM", "RENEGOTIATE", `${contract.vendorName} has a near-term renewal and utilisation below 75%.`, "Renegotiate before renewal using usage evidence.", Math.round(contract.annualCost * 0.15)));
    if (typeof util === "number" && util < 0.15) add(findings, makeFinding(contract, input, "RETIREMENT_CANDIDATE", "HIGH", "RETIRE", `${contract.vendorName} utilisation is below retirement threshold.`, "Assess retirement before renewal.", typeof contract.annualCost === "number" ? contract.annualCost : undefined));
    if (duplicate && typeof util === "number" && util < 0.6) add(findings, makeFinding(contract, input, "CONSOLIDATION_BEFORE_RENEWAL", "HIGH", "CONSOLIDATE", `${contract.vendorName} is duplicated and below 60% utilisation.`, "Consolidate duplicate vendors before renewal.", typeof contract.annualCost === "number" ? Math.round(contract.annualCost * 0.4) : undefined));
  }
  const opportunity = generateRenewalContractOpportunity(findings);
  const upcomingRenewals = findings.filter((finding) => typeof finding.daysToRenewal === "number" && finding.daysToRenewal >= 0 && finding.daysToRenewal <= 180 && finding.findingType === "UPCOMING_RENEWAL");
  const windows: RenewalContractResult["renewalCalendar"] = ["0–30 days", "31–60 days", "61–90 days", "91–120 days", "121–180 days"].map((label) => ({ label: label as RenewalContractResult["renewalCalendar"][number]["label"], findings: findings.filter((finding) => { const d = finding.daysToRenewal; if (typeof d !== "number") return false; if (label === "0–30 days") return d <= 30; if (label === "31–60 days") return d >= 31 && d <= 60; if (label === "61–90 days") return d >= 61 && d <= 90; if (label === "91–120 days") return d >= 91 && d <= 120; return d >= 121 && d <= 180; }) }));
  const riskBreakdown = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } as RenewalContractResult["riskBreakdown"];
  findings.forEach((finding) => { riskBreakdown[finding.riskLevel] += 1; });
  const evidenceRefs = Array.from(new Set(findings.flatMap((finding) => finding.evidenceRefs)));
  return { category: "Renewal & Contract Intelligence", platformLayer: "Discovery → Trust → Renewal Risk → Contract Opportunity → Evidence", executionRequired: false, summary: { upcomingRenewals: upcomingRenewals.length, annualSpendReviewed: input.contracts.reduce((sum, contract) => sum + Number(contract.annualCost ?? 0), 0), potentialAnnualSavings: opportunity.totalPotentialAnnualSavings, highRiskRenewals: findings.filter((finding) => finding.riskLevel === "HIGH" || finding.riskLevel === "CRITICAL").length, contractsMissingOwner: findings.filter((finding) => finding.findingType === "OWNER_GAP").length, negotiationOpportunities: findings.filter((finding) => finding.findingType === "NEGOTIATION_OPPORTUNITY").length }, findings, opportunity, upcomingRenewals, renewalCalendar: windows, riskBreakdown, evidenceRefs };
}

export const renewalContractPlaybook = { category: "Renewal & Contract Intelligence" as const, platformLayer: "Discovery → Trust → Renewal Risk → Contract Opportunity → Evidence" as const, executionRequired: false as const, evaluate: runRenewalContractPlaybook };
