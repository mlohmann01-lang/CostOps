import { generateSaaSRationalisationOpportunity } from "./saas-rationalisation-opportunity-provider";
import { scoreSaaSRationalisationTrust } from "./saas-rationalisation-trust";
import type {
  SaaSApplicationInput,
  SaaSCapabilityCategory,
  SaaSOverlapGroup,
  SaaSRationalisationFinding,
  SaaSRationalisationFindingType,
  SaaSRationalisationInput,
  SaaSRationalisationResult,
  SaaSRationalisationRiskLevel,
} from "./saas-rationalisation-types";

const CATEGORY_LABELS: Record<SaaSCapabilityCategory, string> = {
  COLLABORATION: "Collaboration",
  COMMUNICATION: "Communication",
  PROJECT_MANAGEMENT: "Project Management",
  DESIGN: "Design",
  DOCUMENT_STORAGE: "Document Storage",
  AI_PRODUCTIVITY: "AI Productivity",
  CRM: "CRM",
  MARKETING: "Marketing",
  ANALYTICS: "Analytics",
  FINANCE: "Finance",
  SECURITY: "Security",
  OTHER: "Other",
};

export const demoSaaSRationalisationInput: SaaSRationalisationInput = {
  tenantId: "demo-saas-rationalisation-tenant",
  asOfDate: "2026-06-02T00:00:00.000Z",
  applications: [
    { id: "app-teams", vendorName: "Microsoft", applicationName: "Microsoft Teams", capabilityCategory: "COMMUNICATION", owner: "collaboration@example.com", approved: true, usersAssigned: 1240, activeUsers: 1090, annualCostEstimate: 0, lastActivityDays: 1, evidenceRefs: ["enterprise-app:teams", "usage:teams"] },
    { id: "app-slack", vendorName: "Slack", applicationName: "Slack", capabilityCategory: "COMMUNICATION", owner: "engineering@example.com", approved: true, usersAssigned: 280, activeUsers: 96, annualCostEstimate: 42000, lastActivityDays: 3, renewalDate: "2026-07-15", evidenceRefs: ["enterprise-app:slack", "usage:slack", "renewal:slack"] },
    { id: "app-zoom", vendorName: "Zoom", applicationName: "Zoom", capabilityCategory: "COMMUNICATION", owner: "it@example.com", approved: true, usersAssigned: 410, activeUsers: 148, annualCostEstimate: 36000, lastActivityDays: 6, renewalDate: "2026-08-10", evidenceRefs: ["enterprise-app:zoom", "usage:zoom", "renewal:zoom"] },
    { id: "app-onedrive", vendorName: "Microsoft", applicationName: "OneDrive", capabilityCategory: "DOCUMENT_STORAGE", owner: "it@example.com", approved: true, usersAssigned: 1240, activeUsers: 1180, annualCostEstimate: 0, lastActivityDays: 1, evidenceRefs: ["enterprise-app:onedrive", "usage:onedrive"] },
    { id: "app-dropbox", vendorName: "Dropbox", applicationName: "Dropbox", capabilityCategory: "DOCUMENT_STORAGE", owner: "finance-ops@example.com", approved: false, usersAssigned: 62, activeUsers: 4, annualCostEstimate: 18600, lastActivityDays: 120, evidenceRefs: ["enterprise-app:dropbox", "usage:dropbox"] },
    { id: "app-box", vendorName: "Box", applicationName: "Box", capabilityCategory: "DOCUMENT_STORAGE", approved: false, usersAssigned: 40, activeUsers: 2, annualCostEstimate: 14400, lastActivityDays: 140, evidenceRefs: ["enterprise-app:box", "usage:box"] },
    { id: "app-miro", vendorName: "Miro", applicationName: "Miro", capabilityCategory: "COLLABORATION", owner: "product@example.com", approved: true, usersAssigned: 80, activeUsers: 42, annualCostEstimate: 12000, lastActivityDays: 7, evidenceRefs: ["enterprise-app:miro", "usage:miro"] },
    { id: "app-lucid", vendorName: "Lucid", applicationName: "Lucid", capabilityCategory: "COLLABORATION", owner: "product@example.com", approved: true, usersAssigned: 36, activeUsers: 9, annualCostEstimate: 7200, lastActivityDays: 11, evidenceRefs: ["enterprise-app:lucid", "usage:lucid"] },
    { id: "app-asana", vendorName: "Asana", applicationName: "Asana", capabilityCategory: "PROJECT_MANAGEMENT", owner: "pmo@example.com", approved: true, usersAssigned: 120, activeUsers: 38, annualCostEstimate: 21600, lastActivityDays: 4, evidenceRefs: ["enterprise-app:asana", "usage:asana"] },
    { id: "app-monday", vendorName: "Monday", applicationName: "Monday", capabilityCategory: "PROJECT_MANAGEMENT", approved: false, usersAssigned: 48, activeUsers: 13, annualCostEstimate: 13200, lastActivityDays: 18, evidenceRefs: ["enterprise-app:monday", "usage:monday"] },
    { id: "app-jira", vendorName: "Atlassian", applicationName: "Jira", capabilityCategory: "PROJECT_MANAGEMENT", owner: "engineering@example.com", approved: true, usersAssigned: 360, activeUsers: 302, annualCostEstimate: 54000, lastActivityDays: 1, evidenceRefs: ["enterprise-app:jira", "usage:jira"] },
    { id: "app-figma", vendorName: "Figma", applicationName: "Figma", capabilityCategory: "DESIGN", owner: "design@example.com", approved: true, usersAssigned: 86, activeUsers: 70, annualCostEstimate: 46440, lastActivityDays: 2, evidenceRefs: ["enterprise-app:figma", "usage:figma"] },
    { id: "app-canva", vendorName: "Canva", applicationName: "Canva", capabilityCategory: "DESIGN", approved: false, usersAssigned: 44, activeUsers: 7, annualCostEstimate: 6600, lastActivityDays: 19, evidenceRefs: ["enterprise-app:canva", "usage:canva"] },
    { id: "app-chatgpt", vendorName: "OpenAI", applicationName: "ChatGPT", capabilityCategory: "AI_PRODUCTIVITY", approved: false, usersAssigned: 34, activeUsers: 31, annualCostEstimate: 10200, lastActivityDays: 2, evidenceRefs: ["enterprise-app:chatgpt", "oauth-app:chatgpt", "usage:chatgpt"] },
    { id: "app-copilot", vendorName: "Microsoft", applicationName: "Microsoft Copilot", capabilityCategory: "AI_PRODUCTIVITY", owner: "ai-governance@example.com", approved: true, usersAssigned: 320, activeUsers: 84, annualCostEstimate: 115200, lastActivityDays: 1, evidenceRefs: ["enterprise-app:copilot", "usage:copilot"] },
    { id: "app-claude", vendorName: "Anthropic", applicationName: "Claude", capabilityCategory: "AI_PRODUCTIVITY", approved: false, usersAssigned: 18, activeUsers: 15, annualCostEstimate: 5400, lastActivityDays: 5, evidenceRefs: ["enterprise-app:claude", "oauth-app:claude", "usage:claude"] },
    { id: "app-salesforce", vendorName: "Salesforce", applicationName: "Salesforce", capabilityCategory: "CRM", owner: "sales-ops@example.com", approved: true, usersAssigned: 540, activeUsers: 430, annualCostEstimate: 388800, lastActivityDays: 1, evidenceRefs: ["enterprise-app:salesforce", "usage:salesforce"] },
    { id: "app-hubspot", vendorName: "HubSpot", applicationName: "HubSpot", capabilityCategory: "CRM", owner: "marketing@example.com", approved: true, usersAssigned: 70, activeUsers: 22, annualCostEstimate: 24000, lastActivityDays: 9, evidenceRefs: ["enterprise-app:hubspot", "usage:hubspot"] },
    { id: "app-tableau", vendorName: "Tableau", applicationName: "Tableau", capabilityCategory: "ANALYTICS", owner: "data@example.com", approved: true, usersAssigned: 150, activeUsers: 28, annualCostEstimate: 72000, lastActivityDays: 15, renewalDate: "2026-09-01", evidenceRefs: ["enterprise-app:tableau", "usage:tableau", "renewal:tableau"] },
    { id: "app-powerbi", vendorName: "Microsoft", applicationName: "Power BI", capabilityCategory: "ANALYTICS", owner: "data@example.com", approved: true, usersAssigned: 620, activeUsers: 500, annualCostEstimate: 0, lastActivityDays: 1, evidenceRefs: ["enterprise-app:powerbi", "usage:powerbi"] },
  ],
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const utilisationRate = (app: SaaSApplicationInput) => app.usersAssigned && app.activeUsers !== undefined ? app.activeUsers / app.usersAssigned : undefined;
const unusedSeatSavings = (app: SaaSApplicationInput) => app.annualCostEstimate && app.usersAssigned && app.activeUsers !== undefined ? Math.round(Math.max(0, app.usersAssigned - app.activeUsers) * (app.annualCostEstimate / app.usersAssigned)) : undefined;
const daysUntil = (date: string, asOf: Date) => Math.ceil((new Date(date).getTime() - asOf.getTime()) / 86_400_000);
const evidenceRefs = (app: SaaSApplicationInput) => app.evidenceRefs?.length ? app.evidenceRefs : [`application:${app.id}`];

function trustScore(app: SaaSApplicationInput) {
  return scoreSaaSRationalisationTrust({ ownerKnown: Boolean(app.owner), assignedUserCountKnown: app.usersAssigned !== undefined, activeUserCountKnown: app.activeUsers !== undefined, annualCostKnown: app.annualCostEstimate !== undefined, renewalDateKnown: Boolean(app.renewalDate), evidenceRefsAvailable: evidenceRefs(app).length > 0, approvedStatusKnown: app.approved !== undefined }).trustScore;
}

function finding(input: { app: SaaSApplicationInput; type: SaaSRationalisationFindingType; risk: SaaSRationalisationRiskLevel; rationale: string; action: string; overlapGroup?: string; savings?: number }): SaaSRationalisationFinding {
  const rate = utilisationRate(input.app);
  return { id: `saas-rat-${slug(input.app.applicationName)}-${input.type.toLowerCase()}${input.overlapGroup ? `-${slug(input.overlapGroup)}` : ""}`, vendorName: input.app.vendorName, applicationName: input.app.applicationName, findingType: input.type, riskLevel: input.risk, capabilityCategory: input.app.capabilityCategory, overlapGroup: input.overlapGroup, usersAssigned: input.app.usersAssigned, activeUsers: input.app.activeUsers, utilisationRate: rate === undefined ? undefined : Number(rate.toFixed(2)), owner: input.app.owner, annualCostEstimate: input.app.annualCostEstimate, potentialAnnualSavings: input.savings && input.savings > 0 ? Math.round(input.savings) : undefined, trustScore: trustScore(input.app), rationale: input.rationale, recommendedAction: input.action, evidenceRefs: evidenceRefs(input.app) };
}

function statusFor(app: SaaSApplicationInput): SaaSOverlapGroup["applications"][number]["status"] {
  const rate = utilisationRate(app);
  if (app.approved === false) return "unmanaged";
  if ((app.lastActivityDays ?? 0) > 90) return "dormant";
  if (rate !== undefined && rate < 0.35) return "underused";
  if (app.approved === true) return "approved";
  return "active";
}

function overlapGroups(applications: SaaSApplicationInput[]): SaaSOverlapGroup[] {
  const byCategory = new Map<SaaSCapabilityCategory, SaaSApplicationInput[]>();
  for (const app of applications) byCategory.set(app.capabilityCategory, [...(byCategory.get(app.capabilityCategory) ?? []), app]);
  return Array.from(byCategory.entries()).filter(([, apps]) => apps.length > 1).map(([category, apps]) => ({ id: `overlap-${slug(category)}`, capabilityCategory: category, displayName: CATEGORY_LABELS[category], applications: apps.map((app) => ({ vendorName: app.vendorName, applicationName: app.applicationName, approved: app.approved, status: statusFor(app), usersAssigned: app.usersAssigned, activeUsers: app.activeUsers })) }));
}

function duplicateCapabilityFindings(applications: SaaSApplicationInput[]) {
  return overlapGroups(applications).filter((group) => group.applications.some((app) => app.approved === true || (app.usersAssigned ?? 0) >= 20)).flatMap((group) => group.applications.map((app) => finding({ app: applications.find((candidate) => candidate.id === app.applicationName || candidate.applicationName === app.applicationName) ?? applications.find((candidate) => candidate.applicationName === app.applicationName)!, type: "DUPLICATE_CAPABILITY", risk: "MEDIUM", overlapGroup: group.displayName, rationale: `${app.applicationName} overlaps with other ${group.displayName} tools in use.`, action: "Review consolidation opportunity and define the preferred tool for this capability." })));
}

function consolidationCandidateFindings(applications: SaaSApplicationInput[]) {
  return overlapGroups(applications).flatMap((group) => {
    const fullApps = group.applications.map((app) => applications.find((candidate) => candidate.applicationName === app.applicationName)!).filter(Boolean);
    const maxActive = Math.max(...fullApps.map((app) => app.activeUsers ?? 0));
    return fullApps.filter((app) => (app.activeUsers ?? 0) > 0 && (app.activeUsers ?? 0) < maxActive * 0.35).map((app) => finding({ app, type: "CONSOLIDATION_CANDIDATE", risk: "MEDIUM", overlapGroup: group.displayName, savings: app.annualCostEstimate, rationale: `${app.applicationName} has materially lower active usage than another ${group.displayName} tool.`, action: "Assess whether users can move to the preferred tool before renewal or expansion." }));
  });
}

function appFindings(app: SaaSApplicationInput, asOf: Date) {
  const findings: SaaSRationalisationFinding[] = [];
  const rate = utilisationRate(app);
  if (rate !== undefined && app.usersAssigned && rate < 0.35) findings.push(finding({ app, type: "UNDERUSED_VENDOR", risk: "MEDIUM", savings: unusedSeatSavings(app), rationale: `${app.applicationName} usage is below 35% of assigned users.`, action: "Validate whether unused seats can be reclaimed or downgraded." }));
  if ((app.lastActivityDays ?? 0) > 90) findings.push(finding({ app, type: "DORMANT_VENDOR", risk: (app.annualCostEstimate ?? 0) > 10000 ? "MEDIUM" : "LOW", savings: app.annualCostEstimate, rationale: `${app.applicationName} appears dormant based on activity evidence older than 90 days.`, action: "Review retirement or renewal removal options." }));
  if (app.approved === false) findings.push(finding({ app, type: "UNMANAGED_VENDOR", risk: "HIGH", rationale: `${app.applicationName} is not approved or governed.`, action: "Review approval status and create an exception or remediation plan." }));
  if (!app.owner) findings.push(finding({ app, type: "OWNER_GAP", risk: "HIGH", rationale: `${app.applicationName} has no business owner assigned.`, action: "Assign business owner before rationalisation, renewal, or governance decisions." }));
  if (app.renewalDate && rate !== undefined && rate < 0.5 && daysUntil(app.renewalDate, asOf) >= 0 && daysUntil(app.renewalDate, asOf) <= 90) findings.push(finding({ app, type: "RENEWAL_RISK", risk: "HIGH", savings: app.annualCostEstimate ? app.annualCostEstimate * 0.2 : undefined, rationale: `${app.applicationName} renews within 90 days with utilisation below 50%.`, action: "Review renewal-risk vendor before commitment date." }));
  if ((app.annualCostEstimate ?? 0) > 25_000 && rate !== undefined && rate < 0.5) findings.push(finding({ app, type: "HIGH_COST_LOW_USAGE", risk: "HIGH", savings: app.annualCostEstimate ? app.annualCostEstimate * 0.25 : undefined, rationale: `${app.applicationName} is high cost with utilisation below 50%.`, action: "Validate business need and rationalisation path with the owner." }));
  return findings;
}

function summary(applications: SaaSApplicationInput[], findings: SaaSRationalisationFinding[], groups: SaaSOverlapGroup[], potentialAnnualSavings: number) {
  return { applicationsReviewed: applications.length, overlapGroups: groups.length, duplicateCapabilityFindings: findings.filter((finding) => finding.findingType === "DUPLICATE_CAPABILITY").length, potentialAnnualSavings, governanceFindings: findings.filter((finding) => ["UNMANAGED_VENDOR", "OWNER_GAP", "RENEWAL_RISK"].includes(finding.findingType)).length, renewalRisks: findings.filter((finding) => finding.findingType === "RENEWAL_RISK").length };
}

export function runSaaSRationalisationPlaybook(input: SaaSRationalisationInput): SaaSRationalisationResult {
  const asOf = new Date(input.asOfDate ?? new Date().toISOString());
  const groups = overlapGroups(input.applications);
  const findings = [...duplicateCapabilityFindings(input.applications), ...consolidationCandidateFindings(input.applications), ...input.applications.flatMap((app) => appFindings(app, asOf))];
  const opportunity = generateSaaSRationalisationOpportunity(findings);
  const evidence = Array.from(new Set(findings.flatMap((finding) => finding.evidenceRefs)));
  const governanceFindings = findings.filter((finding) => ["UNMANAGED_VENDOR", "OWNER_GAP", "RENEWAL_RISK"].includes(finding.findingType)).length;
  return { category: "SaaS Rationalisation / Vendor Overlap Intelligence", platformLayer: "Discovery → Trust → Rationalisation Findings → Vendor Overlap Intelligence → Opportunity → Evidence", executionRequired: false, summary: summary(input.applications, findings, groups, opportunity.totalPotentialAnnualSavings), findings, opportunity, overlapGroups: groups, governanceExposureScore: input.applications.length ? Math.min(100, Math.round((governanceFindings / input.applications.length) * 100)) : 0, evidenceRefs: evidence };
}

export class SaaSRationalisationPlaybook {
  playbookId = "saas-rationalisation-v1";
  name = "SaaS Rationalisation";
  executionRequired = false as const;
  evaluate(input: SaaSRationalisationInput) { return runSaaSRationalisationPlaybook(input); }
}

export const saasRationalisationPlaybook = new SaaSRationalisationPlaybook();
