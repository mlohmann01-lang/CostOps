import { generateOwnershipOpportunity } from "./ownership-intelligence-opportunity-provider";
import { scoreOwnershipTrust } from "./ownership-intelligence-trust";
import type { OwnershipDiscoveryInput, OwnershipFinding, OwnershipGapType, OwnershipInput, OwnershipRecommendation, OwnershipResult, OwnershipRiskLevel, OwnershipStatus } from "./ownership-intelligence-types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
const daysUntil = (date: string | undefined, asOf: Date) => date ? Math.ceil((new Date(`${date}T00:00:00.000Z`).getTime() - asOf.getTime()) / DAY_MS) : undefined;
const ownerFields = (app: OwnershipInput) => [app.businessOwner, app.technicalOwner, app.budgetOwner, app.renewalOwner, app.executiveSponsor].filter(Boolean);

export function buildDemoOwnershipInput(asOfDate = new Date().toISOString()): OwnershipDiscoveryInput {
  const asOf = new Date(asOfDate);
  return { tenantId: "demo-ownership-intelligence-tenant", asOfDate: asOf.toISOString(), applications: [
    { id: "own-slack", vendorName: "Slack", applicationName: "Slack", capabilityCategory: "Communication", businessOwner: "engineering@example.com", technicalOwner: "collaboration-admin@example.com", budgetOwner: "engineering-finance@example.com", annualCost: 180000, renewalDate: addDays(asOf, 45), ownerLastConfirmedDays: 60, sourceContext: ["RENEWALS", "SAAS_RATIONALISATION"], evidenceRefs: ["contract:slack", "owner:slack", "renewal:slack"] },
    { id: "own-zoom", vendorName: "Zoom", applicationName: "Zoom", capabilityCategory: "Communication", businessOwner: "it@example.com", technicalOwner: "uc-admin@example.com", annualCost: 95000, ownerLastConfirmedDays: 75, sourceContext: ["SAAS_RATIONALISATION"], evidenceRefs: ["contract:zoom", "owner:zoom"] },
    { id: "own-tableau", vendorName: "Tableau", applicationName: "Tableau", capabilityCategory: "Analytics", businessOwner: "data@example.com", technicalOwner: "bi-admin@example.com", budgetOwner: "data-finance@example.com", renewalOwner: "data@example.com", annualCost: 140000, renewalDate: addDays(asOf, 87), ownerLastConfirmedDays: 45, sourceContext: ["RENEWALS"], evidenceRefs: ["contract:tableau", "owner:tableau", "renewal:tableau"] },
    { id: "own-dropbox", vendorName: "Dropbox", applicationName: "Dropbox", capabilityCategory: "Storage", annualCost: 52000, activeUsers: 27, ownerLastConfirmedDays: 999, sourceContext: ["SHADOW_IT", "SAAS_RATIONALISATION"], evidenceRefs: ["enterprise-app:dropbox", "shadow-it:dropbox"] },
    { id: "own-chatgpt", vendorName: "OpenAI", applicationName: "ChatGPT", capabilityCategory: "AI Productivity", technicalOwner: "platform@example.com", annualCost: 36000, activeUsers: 34, sourceContext: ["AI_GOVERNANCE", "SHADOW_IT"], evidenceRefs: ["enterprise-app:chatgpt", "oauth-app:chatgpt"] },
    { id: "own-claude", vendorName: "Anthropic", applicationName: "Claude", capabilityCategory: "AI Productivity", annualCost: 24000, activeUsers: 16, sourceContext: ["AI_GOVERNANCE"], evidenceRefs: ["enterprise-app:claude", "oauth-app:claude"] },
    { id: "own-box", vendorName: "Box", applicationName: "Box", capabilityCategory: "Storage", businessOwner: "legal@example.com", budgetOwner: "legal-finance@example.com", annualCost: 60000, activeUsers: 2, ownerLastConfirmedDays: 95, sourceContext: ["RENEWALS", "SAAS_RATIONALISATION"], evidenceRefs: ["contract:box", "usage:box"] },
    { id: "own-miro", vendorName: "Miro", applicationName: "Miro", capabilityCategory: "Collaboration", businessOwner: "product@example.com", technicalOwner: "workspace-admin@example.com", budgetOwner: "product-finance@example.com", annualCost: 38000, ownerLastConfirmedDays: 240, sourceContext: ["SAAS_RATIONALISATION"], evidenceRefs: ["contract:miro", "owner:miro"] },
    { id: "own-salesforce", vendorName: "Salesforce", applicationName: "Salesforce", capabilityCategory: "CRM", businessOwner: "revenue@example.com", technicalOwner: "crm-admin@example.com", budgetOwner: "revenue-finance@example.com", renewalOwner: "revops@example.com", executiveSponsor: "cro@example.com", costCentre: "REV-001", annualCost: 240000, renewalDate: addDays(asOf, 210), ownerLastConfirmedDays: 30, sourceContext: ["RENEWALS", "MANUAL"], evidenceRefs: ["contract:salesforce", "owner:salesforce"] },
    { id: "own-hubspot", vendorName: "HubSpot", applicationName: "HubSpot", capabilityCategory: "CRM", businessOwner: "marketing@example.com", technicalOwner: "marketing-ops@example.com", budgetOwner: "marketing-finance@example.com", annualCost: 120000, ownerLastConfirmedDays: 40, riskSignals: ["OWNER_CONFLICT"], sourceContext: ["SAAS_RATIONALISATION", "RENEWALS"], evidenceRefs: ["contract:hubspot", "owner-conflict:hubspot"] },
  ] };
}
export const demoOwnershipInput = buildDemoOwnershipInput();

export function ownershipStatus(app: OwnershipInput): OwnershipStatus {
  if (app.riskSignals?.includes("OWNER_CONFLICT")) return "CONFLICTED";
  if ((app.ownerLastConfirmedDays ?? 0) > 180) return "STALE";
  if (ownerFields(app).length === 0) return "OWNERLESS";
  if (app.businessOwner && app.technicalOwner) return "OWNED";
  return "PARTIALLY_OWNED";
}

function riskFor(app: OwnershipInput, status: OwnershipStatus, gap: OwnershipGapType, base: OwnershipRiskLevel, input: OwnershipDiscoveryInput): OwnershipRiskLevel {
  const days = daysUntil(app.renewalDate, new Date(input.asOfDate ?? new Date().toISOString()));
  if ((app.annualCost ?? 0) > 250000 && status === "OWNERLESS") return "CRITICAL";
  if (gap === "NO_RENEWAL_OWNER" && typeof days === "number" && days <= 90) return "CRITICAL";
  if (app.sourceContext?.includes("AI_GOVERNANCE") && !app.businessOwner && (base === "LOW" || base === "MEDIUM")) return "HIGH";
  if (app.sourceContext?.includes("SHADOW_IT") && ownerFields(app).length === 0) return "HIGH";
  return base;
}

function finding(app: OwnershipInput, input: OwnershipDiscoveryInput, gapType: OwnershipGapType, riskLevel: OwnershipRiskLevel, recommendation: OwnershipRecommendation, rationale: string, recommendedAction: string): OwnershipFinding {
  const status = ownershipStatus(app);
  const trust = scoreOwnershipTrust({ businessOwnerKnown: Boolean(app.businessOwner), technicalOwnerKnown: Boolean(app.technicalOwner), budgetOwnerKnown: Boolean(app.budgetOwner), renewalOwnerKnown: Boolean(app.renewalOwner), executiveSponsorKnown: Boolean(app.executiveSponsor), costCentreKnown: Boolean(app.costCentre), ownerRecentlyConfirmed: typeof app.ownerLastConfirmedDays === "number" && app.ownerLastConfirmedDays <= 180, evidenceRefsAvailable: (app.evidenceRefs ?? []).length > 0, sourceContextAvailable: (app.sourceContext ?? []).length > 0 });
  return { id: `${app.id}-${gapType.toLowerCase()}`, vendorName: app.vendorName, applicationName: app.applicationName, ownershipStatus: status, gapType, riskLevel: riskFor(app, status, gapType, riskLevel, input), recommendation, businessOwner: app.businessOwner, technicalOwner: app.technicalOwner, budgetOwner: app.budgetOwner, renewalOwner: app.renewalOwner, executiveSponsor: app.executiveSponsor, costCentre: app.costCentre, annualCost: app.annualCost, renewalDate: app.renewalDate, activeUsers: app.activeUsers, sourceContext: app.sourceContext ?? [], trustScore: trust.trustScore, rationale, recommendedAction, evidenceRefs: app.evidenceRefs ?? [] };
}

export function runOwnershipIntelligencePlaybook(input: OwnershipDiscoveryInput = demoOwnershipInput): OwnershipResult {
  const findings: OwnershipFinding[] = [];
  for (const app of input.applications) {
    if (!app.businessOwner) findings.push(finding(app, input, "NO_BUSINESS_OWNER", "HIGH", "ASSIGN_OWNER", `${app.applicationName} has no business owner recorded.`, "Assign business owner."));
    if (!app.technicalOwner) findings.push(finding(app, input, "NO_TECHNICAL_OWNER", "MEDIUM", "ASSIGN_OWNER", `${app.applicationName} has no technical owner recorded.`, "Assign technical owner."));
    if (typeof app.annualCost === "number" && !app.budgetOwner) findings.push(finding(app, input, "NO_BUDGET_OWNER", "HIGH", "ASSIGN_BUDGET_OWNER", `${app.applicationName} has spend without a budget owner.`, "Assign budget owner."));
    if (app.renewalDate && !app.renewalOwner) findings.push(finding(app, input, "NO_RENEWAL_OWNER", "HIGH", "ASSIGN_RENEWAL_OWNER", `${app.applicationName} has a renewal date without a renewal owner.`, "Assign renewal owner."));
    if ((app.annualCost ?? 0) > 100000 && !app.executiveSponsor) findings.push(finding(app, input, "NO_EXECUTIVE_SPONSOR", "HIGH", "ESCALATE_TO_EXECUTIVE", `${app.applicationName} is high-spend without executive sponsorship.`, "Escalate high-spend ownerless app."));
    if (typeof app.annualCost === "number" && !app.costCentre) findings.push(finding(app, input, "UNKNOWN_COST_CENTRE", "MEDIUM", "INVESTIGATE", `${app.applicationName} has spend without a known cost centre.`, "Validate cost centre."));
    if ((app.ownerLastConfirmedDays ?? 0) > 180) findings.push(finding(app, input, "OWNER_STALE", "MEDIUM", "CONFIRM_OWNER", `${app.applicationName} ownership confirmation is stale.`, "Confirm stale owner."));
    if (app.riskSignals?.includes("OWNER_CONFLICT")) findings.push(finding(app, input, "OWNER_CONFLICT", "HIGH", "RESOLVE_CONFLICT", `${app.applicationName} has conflicting ownership evidence.`, "Resolve owner conflict."));
  }
  const opportunity = generateOwnershipOpportunity(input.applications, findings);
  const ownershipStatusBreakdown = { OWNED: 0, PARTIALLY_OWNED: 0, OWNERLESS: 0, CONFLICTED: 0, STALE: 0 } as Record<OwnershipStatus, number>;
  input.applications.forEach((app) => { ownershipStatusBreakdown[ownershipStatus(app)] += 1; });
  const evidenceRefs = Array.from(new Set(findings.flatMap((item) => item.evidenceRefs)));
  const accountabilityRiskScore = Math.min(100, Math.round(25 + opportunity.highRiskOwnershipFindings * 4 + opportunity.ownerlessApplications * 8 + opportunity.annualSpendWithoutOwner / 50000));
  return { category: "Vendor & Application Ownership Intelligence", platformLayer: "Discovery → Trust → Ownership Gap Detection → Accountability Risk → Opportunity / Remediation Action → Evidence", executionRequired: false, summary: opportunity, findings, opportunity, ownershipStatusBreakdown, accountabilityRiskScore, evidenceRefs };
}

export const ownershipIntelligencePlaybook = { category: "Vendor & Application Ownership Intelligence" as const, platformLayer: "Discovery → Trust → Ownership Gap Detection → Accountability Risk → Opportunity / Remediation Action → Evidence" as const, executionRequired: false as const, evaluate: runOwnershipIntelligencePlaybook };
