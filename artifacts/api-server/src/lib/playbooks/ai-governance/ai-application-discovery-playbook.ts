import { generateAIGovernanceOpportunity } from "./ai-governance-opportunity-provider";
import { scoreAIGovernanceTrust } from "./ai-governance-trust";
import type {
  AIApplicationInput,
  AIApplicationInventoryItem,
  AIGovernanceDiscoveryInput,
  AIGovernanceDiscoveryResult,
  AIGovernanceFinding,
  AIGovernanceFindingType,
  AIGovernanceRiskLevel,
} from "./ai-governance-types";

export const AI_APPLICATION_CATALOG = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Microsoft Copilot",
  "GitHub Copilot",
  "Cursor",
  "Windsurf",
  "Replit",
  "Perplexity",
  "Midjourney",
  "Runway",
  "Lovable",
  "Bolt",
] as const;

const AI_APP_NAMES = new Set(AI_APPLICATION_CATALOG.map((name) => name.toLowerCase()));
const DATA_EXPOSURE_APPS = new Set(["chatgpt", "claude", "gemini", "perplexity"]);
const SOURCE_CODE_EXPOSURE_APPS = new Set(["cursor", "windsurf", "github copilot", "replit", "bolt", "lovable"]);

export const demoAIGovernanceDiscoveryInput: AIGovernanceDiscoveryInput = {
  tenantId: "demo-ai-governance-tenant",
  enterpriseApplications: [
    { id: "ai-chatgpt", applicationName: "ChatGPT", approved: false, usersDetected: 34, estimatedAnnualSpend: 10200, policyCoverage: false, evidenceRefs: ["enterprise-app:chatgpt", "oauth-app:chatgpt", "signin:chatgpt-34"] },
    { id: "ai-claude", applicationName: "Claude", approved: false, usersDetected: 16, estimatedAnnualSpend: 4800, policyCoverage: false, evidenceRefs: ["enterprise-app:claude", "oauth-app:claude", "signin:claude-16"] },
    { id: "ai-copilot", applicationName: "Microsoft Copilot", approved: true, owner: "ai-governance@example.com", usersDetected: 42, estimatedAnnualSpend: 15120, policyCoverage: false, evidenceRefs: ["enterprise-app:copilot", "signin:copilot-42"] },
    { id: "ai-github-copilot", applicationName: "GitHub Copilot", approved: true, owner: "engineering@example.com", usersDetected: 11, estimatedAnnualSpend: 2280, policyCoverage: true, evidenceRefs: ["enterprise-app:github-copilot", "signin:github-copilot-11"] },
    { id: "ai-cursor", applicationName: "Cursor", approved: false, usersDetected: 9, estimatedAnnualSpend: 1800, policyCoverage: false, evidenceRefs: ["enterprise-app:cursor", "signin:cursor-9"] },
    { id: "ai-perplexity", applicationName: "Perplexity", approved: false, owner: "research@example.com", usersDetected: 7, estimatedAnnualSpend: 1260, policyCoverage: false, evidenceRefs: ["oauth-app:perplexity", "signin:perplexity-7"] },
    { id: "ai-gemini", applicationName: "Gemini", approved: false, owner: "data@example.com", usersDetected: 4, estimatedAnnualSpend: 960, policyCoverage: false, evidenceRefs: ["enterprise-app:gemini", "signin:gemini-4"] },
  ],
  oauthApplications: [],
  signInEvents: [
    { id: "signin:chatgpt-34", applicationId: "ai-chatgpt", applicationName: "ChatGPT" },
    { id: "signin:claude-16", applicationId: "ai-claude", applicationName: "Claude" },
    { id: "signin:copilot-42", applicationId: "ai-copilot", applicationName: "Microsoft Copilot" },
  ],
};

const isAIApplication = (app: AIApplicationInput) => AI_APP_NAMES.has(app.applicationName.toLowerCase());
const evidenceFor = (app: AIApplicationInput, input: AIGovernanceDiscoveryInput) => Array.from(new Set([
  ...(app.evidenceRefs ?? []),
  ...(input.signInEvents ?? []).filter((event) => event.applicationId === app.id || event.applicationName === app.applicationName).map((event) => event.id),
]));

function buildFinding(app: AIApplicationInput, input: AIGovernanceDiscoveryInput, findingType: AIGovernanceFindingType, riskLevel: AIGovernanceRiskLevel, rationale: string, recommendedAction: string, potentialAnnualSavings?: number): AIGovernanceFinding {
  const evidenceRefs = evidenceFor(app, input);
  const trust = scoreAIGovernanceTrust({
    ownerKnown: Boolean(app.owner),
    approvalStatusKnown: typeof app.approved === "boolean",
    usageEvidenceAvailable: Number(app.usersDetected ?? 0) > 0 || evidenceRefs.some((ref) => ref.startsWith("signin:")),
    spendEstimateAvailable: typeof app.estimatedAnnualSpend === "number",
    applicationMetadataAvailable: Boolean(app.id && app.applicationName),
    evidenceRefsAvailable: evidenceRefs.length > 0,
  });

  return {
    id: `${app.id}-${findingType.toLowerCase()}`,
    applicationName: app.applicationName,
    findingType,
    riskLevel,
    usersDetected: app.usersDetected ?? 0,
    approved: app.approved === true,
    owner: app.owner ?? undefined,
    estimatedAnnualSpend: app.estimatedAnnualSpend,
    trustScore: trust.trustScore,
    rationale,
    recommendedAction,
    evidenceRefs,
    potentialAnnualSavings,
  };
}

export function runAIApplicationDiscoveryPlaybook(input: AIGovernanceDiscoveryInput = demoAIGovernanceDiscoveryInput): AIGovernanceDiscoveryResult {
  const apps = [...(input.enterpriseApplications ?? []), ...(input.oauthApplications ?? [])].filter(isAIApplication);
  const findings: AIGovernanceFinding[] = [];
  const duplicateDetected = apps.length > 1;

  for (const app of apps) {
    const normalizedName = app.applicationName.toLowerCase();
    if (app.approved === false) findings.push(buildFinding(app, input, "UNAPPROVED_AI_APPLICATION", "HIGH", `${app.applicationName} is used outside the approved AI application list.`, "Review approval status and create an exception or remediation plan."));
    if (app.owner == null) findings.push(buildFinding(app, input, "AI_OWNER_GAP", "HIGH", `${app.applicationName} has no accountable business or technical owner recorded.`, "Assign owner before policy and usage decisions."));
    if (app.approved === true && app.policyCoverage === false) findings.push(buildFinding(app, input, "AI_POLICY_GAP", "HIGH", `${app.applicationName} is approved but policy coverage is missing or unconfirmed.`, "Apply AI policy coverage and document controls."));
    if (SOURCE_CODE_EXPOSURE_APPS.has(normalizedName)) findings.push(buildFinding(app, input, "SOURCE_CODE_EXPOSURE_RISK", "HIGH", `${app.applicationName} can involve source code upload or model interaction.`, "Review code-upload controls and developer usage policy."));
    if (DATA_EXPOSURE_APPS.has(normalizedName)) findings.push(buildFinding(app, input, "DATA_EXPOSURE_RISK", "HIGH", `${app.applicationName} can involve corporate data disclosure through prompts or file uploads.`, "Review data-sharing controls and user guidance."));
    if (duplicateDetected) findings.push(buildFinding(app, input, "DUPLICATE_AI_TOOLING", "MEDIUM", `${app.applicationName} is part of overlapping AI assistant usage across the tenant.`, "Consolidate AI tooling where policy and usage support it.", app.estimatedAnnualSpend ? Math.round(app.estimatedAnnualSpend * 0.2) : undefined));
    if ((app.usersDetected ?? 0) > 25) findings.push(buildFinding(app, input, "HIGH_USAGE_AI_APPLICATION", "MEDIUM", `${app.applicationName} has broad usage and requires governance attention.`, "Review ownership, policy coverage, and user guidance."));
    if ((app.estimatedAnnualSpend ?? 0) > 0 && app.approved === false) findings.push(buildFinding(app, input, "UNMANAGED_AI_SPEND", "HIGH", `${app.applicationName} has detected spend without approval.`, "Review unmanaged AI spend and decide whether to approve, consolidate, or stop renewal exposure.", app.estimatedAnnualSpend));
  }

  const opportunity = generateAIGovernanceOpportunity(findings);
  const evidenceRefs = Array.from(new Set(findings.flatMap((finding) => finding.evidenceRefs)));
  const inventory: AIApplicationInventoryItem[] = apps.map((app) => ({
    applicationName: app.applicationName,
    usersDetected: app.usersDetected ?? 0,
    approved: app.approved === true,
    owner: app.owner ?? undefined,
    policyCoverage: app.policyCoverage,
    estimatedAnnualSpend: app.estimatedAnnualSpend,
    riskLevel: findings.some((finding) => finding.applicationName === app.applicationName && finding.riskLevel === "HIGH") ? "HIGH" : "MEDIUM",
  }));

  return {
    category: "AI Application Discovery & AI Governance Exposure",
    platformLayer: "Discovery → Trust → Governance → Opportunity",
    executionRequired: false,
    inventory,
    summary: {
      aiApplicationsDetected: apps.length,
      unapprovedAIApps: apps.filter((app) => app.approved === false).length,
      policyGaps: findings.filter((finding) => finding.findingType === "AI_POLICY_GAP").length,
      governanceExposureScore: opportunity.governanceExposureScore,
      potentialAnnualSavings: opportunity.potentialAnnualSavings,
      highRiskFindings: findings.filter((finding) => finding.riskLevel === "HIGH" || finding.riskLevel === "CRITICAL").length,
    },
    findings,
    opportunity,
    governanceExposureScore: opportunity.governanceExposureScore,
    policyCoverageScore: opportunity.policyCoverageScore,
    evidenceRefs,
  };
}

export const aiApplicationDiscoveryPlaybook = {
  category: "AI Application Discovery & AI Governance Exposure" as const,
  platformLayer: "Discovery → Trust → Governance → Opportunity" as const,
  executionRequired: false as const,
  evaluate: runAIApplicationDiscoveryPlaybook,
};
