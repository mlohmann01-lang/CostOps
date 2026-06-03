import { generateShadowITOpportunities } from "./shadow-it-opportunity-provider";
import { scoreShadowITTrust } from "./shadow-it-trust";
import type {
  ShadowITApplicationInput,
  ShadowITDashboardTile,
  ShadowITDiscoveryInput,
  ShadowITDiscoveryResult,
  ShadowITFinding,
  ShadowITFindingType,
  ShadowITRiskLevel,
} from "./shadow-it-types";

const KNOWN_AI_APPLICATIONS = new Set(["CHATGPT", "CLAUDE", "GEMINI", "PERPLEXITY", "GROK", "CURSOR"]);

const DUPLICATE_CAPABILITY_GROUPS: Record<string, string[]> = {
  whiteboard: ["MIRO", "LUCID"],
  storage: ["DROPBOX", "ONEDRIVE"],
  meetings: ["ZOOM", "TEAMS"],
  messaging: ["SLACK", "TEAMS"],
  design: ["FIGMA", "SKETCH"],
};

export const demoShadowITDiscoveryInput: ShadowITDiscoveryInput = {
  tenantId: "demo-shadow-it-tenant",
  enterpriseApplications: [
    { id: "enterprise-app-chatgpt", applicationName: "ChatGPT", approved: false, userCount: 34, category: "AI", estimatedSeatCost: 300, lastActivityDays: 2, permissions: ["profile", "email"] },
    { id: "enterprise-app-notion", applicationName: "Notion", approved: false, userCount: 21, owner: "product-ops@example.com", category: "Collaboration", estimatedSeatCost: 180, lastActivityDays: 12 },
    { id: "enterprise-app-dropbox", applicationName: "Dropbox", approved: false, userCount: 9, owner: "it@example.com", category: "Storage", estimatedSeatCost: 240, lastActivityDays: 31 },
    { id: "enterprise-app-miro", applicationName: "Miro", approved: false, userCount: 7, category: "Whiteboard", estimatedSeatCost: 180, lastActivityDays: 96 },
    { id: "enterprise-app-figma", applicationName: "Figma", approved: true, userCount: 11, owner: "design@example.com", category: "Design", estimatedSeatCost: 540, lastActivityDays: 4 },
  ],
  oauthApplications: [
    { id: "oauth-chatgpt", oauthAppId: "oauth-chatgpt", applicationName: "ChatGPT", approved: false, userCount: 34, category: "AI", permissions: ["User.Read", "Mail.Read"] },
    { id: "oauth-dropbox", oauthAppId: "oauth-dropbox", applicationName: "Dropbox", approved: false, userCount: 9, owner: "it@example.com", category: "Storage" },
  ],
  signInEvents: [
    { id: "signin-chatgpt-1", applicationId: "enterprise-app-chatgpt", applicationName: "ChatGPT", userId: "user-1" },
    { id: "signin-notion-1", applicationId: "enterprise-app-notion", applicationName: "Notion", userId: "user-2" },
    { id: "signin-dropbox-1", applicationId: "enterprise-app-dropbox", applicationName: "Dropbox", userId: "user-3" },
    { id: "signin-miro-1", applicationId: "enterprise-app-miro", applicationName: "Miro", userId: "user-4" },
    { id: "signin-figma-1", applicationId: "enterprise-app-figma", applicationName: "Figma", userId: "user-5" },
  ],
};

function normalizedName(value: string) {
  return value.trim().toUpperCase();
}

function slug(value: string) {
  return normalizedName(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function evidenceFor(app: ShadowITApplicationInput, input: ShadowITDiscoveryInput) {
  const refs = new Set<string>([`enterprise-app:${app.id}`]);
  const oauth = (input.oauthApplications ?? []).find((candidate) => normalizedName(candidate.applicationName) === normalizedName(app.applicationName));
  if (oauth) refs.add(`oauth-app:${oauth.oauthAppId ?? oauth.id}`);
  for (const event of input.signInEvents ?? []) {
    if (event.applicationId === app.id || normalizedName(event.applicationName) === normalizedName(app.applicationName)) refs.add(`sign-in:${event.id}`);
  }
  return Array.from(refs);
}

function hasSignInEvidence(app: ShadowITApplicationInput, input: ShadowITDiscoveryInput) {
  return evidenceFor(app, input).some((ref) => ref.startsWith("sign-in:"));
}

function makeFinding(input: ShadowITDiscoveryInput, app: ShadowITApplicationInput, findingType: ShadowITFindingType, riskLevel: ShadowITRiskLevel, rationale: string, recommendedAction: string, index = 0): ShadowITFinding {
  const trust = scoreShadowITTrust({
    ownerKnown: Boolean(app.owner),
    signInEvidenceAvailable: hasSignInEvidence(app, input),
    userCountAvailable: typeof app.userCount === "number",
    applicationMetadataAvailable: Boolean(app.id && app.applicationName),
  });
  return {
    id: `shadow-it-${slug(app.applicationName)}-${findingType.toLowerCase()}${index ? `-${index}` : ""}`,
    applicationName: app.applicationName,
    findingType,
    riskLevel,
    userCount: app.userCount ?? 0,
    owner: app.owner ?? undefined,
    category: app.category,
    annualCostEstimate: app.annualCostEstimate ?? (app.estimatedSeatCost && app.userCount ? app.estimatedSeatCost * app.userCount : undefined),
    trustScore: trust.trustScore,
    rationale,
    recommendedAction,
    evidenceRefs: evidenceFor(app, input),
  };
}

function combinedApplications(input: ShadowITDiscoveryInput): ShadowITApplicationInput[] {
  const apps = new Map<string, ShadowITApplicationInput>();
  for (const app of input.enterpriseApplications ?? []) apps.set(normalizedName(app.applicationName), app);
  for (const app of input.oauthApplications ?? []) {
    const key = normalizedName(app.applicationName);
    const existing = apps.get(key);
    apps.set(key, existing ? { ...app, ...existing, permissions: [...(existing.permissions ?? []), ...(app.permissions ?? [])] } : app);
  }
  return Array.from(apps.values());
}

function duplicateFindings(input: ShadowITDiscoveryInput, apps: ShadowITApplicationInput[]) {
  const byName = new Map(apps.map((app) => [normalizedName(app.applicationName), app]));
  const findings: ShadowITFinding[] = [];
  for (const [capability, names] of Object.entries(DUPLICATE_CAPABILITY_GROUPS)) {
    const present = names.map((name) => byName.get(name)).filter(Boolean) as ShadowITApplicationInput[];
    if (present.length < 2) continue;
    for (const app of present) {
      findings.push(makeFinding(input, app, "DUPLICATE_CAPABILITY", "MEDIUM", `${app.applicationName} overlaps with ${present.filter((candidate) => candidate !== app).map((candidate) => candidate.applicationName).join(", ")} in the ${capability} capability.`, "Review consolidation or standardization opportunity with application owners.", findings.length + 1));
    }
  }
  return findings;
}

function appFindings(input: ShadowITDiscoveryInput, app: ShadowITApplicationInput) {
  const findings: ShadowITFinding[] = [];
  const name = normalizedName(app.applicationName);
  if (app.approved === false) findings.push(makeFinding(input, app, "UNAPPROVED_APPLICATION", "MEDIUM", `${app.applicationName} is not on the approved application list.`, "Review application approval status and assign governance owner."));
  if (KNOWN_AI_APPLICATIONS.has(name)) findings.push(makeFinding(input, app, "AI_APPLICATION", app.approved ? "MEDIUM" : "HIGH", `${app.applicationName} is a known AI application${app.approved ? " with approval recorded" : " without approval recorded"}.`, "Review AI application usage, data handling, and approval posture."));
  if (app.owner == null) findings.push(makeFinding(input, app, "ORPHANED_APPLICATION", "HIGH", `${app.applicationName} does not have an accountable owner.`, "Assign an application owner before further governance decisions."));
  if ((app.lastActivityDays ?? 0) > 90) findings.push(makeFinding(input, app, "DORMANT_APPLICATION", "LOW", `${app.applicationName} has no recent activity for more than 90 days.`, "Review for rationalization or retirement opportunity."));
  if ((app.permissions ?? []).some((permission) => /mail\.read|files\.read|directory\.read|write|admin/i.test(permission)) || (app.riskSignals ?? []).length > 0) findings.push(makeFinding(input, app, "HIGH_RISK_APPLICATION", "CRITICAL", `${app.applicationName} has sensitive permissions or high-risk signals.`, "Escalate for security and governance review before approval."));
  if (app.approved === undefined) findings.push(makeFinding(input, app, "UNKNOWN_APPLICATION", "MEDIUM", `${app.applicationName} approval status is unknown.`, "Confirm approval status and ownership."));
  return findings;
}

function dashboardTile(findings: ShadowITFinding[], input: ShadowITDiscoveryInput): ShadowITDashboardTile {
  const applicationsDiscovered = combinedApplications(input).length;
  const potentialAnnualSavings = generateShadowITOpportunities(findings).reduce((sum, opportunity) => sum + (opportunity.potentialAnnualSavings ?? 0), 0);
  const governanceFindings = findings.filter((finding) => finding.findingType !== "DORMANT_APPLICATION" && finding.findingType !== "DUPLICATE_CAPABILITY").length;
  const governanceExposureScore = applicationsDiscovered ? Math.min(100, Math.round((governanceFindings / applicationsDiscovered) * 100)) : 0;
  return {
    title: "Shadow IT Exposure",
    applicationsDiscovered,
    unknownApplications: findings.filter((finding) => finding.findingType === "UNKNOWN_APPLICATION" || finding.findingType === "UNAPPROVED_APPLICATION").length,
    aiApplications: findings.filter((finding) => finding.findingType === "AI_APPLICATION").length,
    duplicateCapabilityFindings: findings.filter((finding) => finding.findingType === "DUPLICATE_CAPABILITY").length,
    potentialAnnualSavings,
    governanceExposureScore,
  };
}

export function runShadowITDiscoveryPlaybook(input: ShadowITDiscoveryInput): ShadowITDiscoveryResult {
  const apps = combinedApplications(input);
  const findings = [...apps.flatMap((app) => appFindings(input, app)), ...duplicateFindings(input, apps)];
  const opportunities = generateShadowITOpportunities(findings);
  return {
    category: "Shadow IT Discovery & Exposure Intelligence",
    platformLayer: "Discovery → Trust → Opportunity",
    executionRequired: false,
    findings,
    opportunities,
    dashboardTile: dashboardTile(findings, input),
  };
}

export class ShadowITDiscoveryPlaybook {
  playbookId = "shadow-it-discovery-v1";
  name = "Shadow IT Discovery";
  category = "Shadow IT Discovery & Exposure Intelligence" as const;
  platformLayer = "Discovery → Trust → Opportunity" as const;
  executionRequired = false as const;

  evaluate(input: ShadowITDiscoveryInput): ShadowITDiscoveryResult {
    return runShadowITDiscoveryPlaybook(input);
  }
}

export const shadowITDiscoveryPlaybook = new ShadowITDiscoveryPlaybook();
