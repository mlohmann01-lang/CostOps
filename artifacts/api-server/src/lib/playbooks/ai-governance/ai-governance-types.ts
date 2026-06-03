export type AIGovernanceFindingType =
  | "UNAPPROVED_AI_APPLICATION"
  | "AI_OWNER_GAP"
  | "DATA_EXPOSURE_RISK"
  | "SOURCE_CODE_EXPOSURE_RISK"
  | "DUPLICATE_AI_TOOLING"
  | "UNMANAGED_AI_SPEND"
  | "AI_POLICY_GAP"
  | "HIGH_USAGE_AI_APPLICATION";

export type AIGovernanceRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AIGovernanceTrustBand = "HIGH" | "MEDIUM" | "LOW" | "BLOCKED";

export interface AIGovernanceFinding {
  id: string;
  applicationName: string;
  findingType: AIGovernanceFindingType;
  riskLevel: AIGovernanceRiskLevel;
  usersDetected: number;
  approved: boolean;
  owner?: string;
  estimatedAnnualSpend?: number;
  trustScore: number;
  rationale: string;
  recommendedAction: string;
  evidenceRefs: string[];
  potentialAnnualSavings?: number;
}

export interface AIApplicationInput {
  id: string;
  applicationName: string;
  approved?: boolean;
  owner?: string | null;
  usersDetected?: number;
  estimatedAnnualSpend?: number;
  policyCoverage?: boolean;
  evidenceRefs?: string[];
}

export interface AIOAuthApplicationInput extends AIApplicationInput {
  oauthAppId?: string;
  consentType?: "ADMIN" | "USER" | "UNKNOWN";
}

export interface AISignInEventInput {
  id: string;
  applicationId?: string;
  applicationName: string;
  userId?: string;
  occurredAt?: string;
}

export interface AIGovernanceDiscoveryInput {
  tenantId?: string;
  enterpriseApplications?: AIApplicationInput[];
  oauthApplications?: AIOAuthApplicationInput[];
  signInEvents?: AISignInEventInput[];
}

export interface AIGovernanceTrustInput {
  ownerKnown: boolean;
  approvalStatusKnown: boolean;
  usageEvidenceAvailable: boolean;
  spendEstimateAvailable: boolean;
  applicationMetadataAvailable: boolean;
  evidenceRefsAvailable: boolean;
}

export interface AIGovernanceTrustResult {
  trustScore: number;
  trustBand: AIGovernanceTrustBand;
  trustReasons: string[];
}

export interface AIGovernanceOpportunityResult {
  potentialAnnualSavings: number;
  governanceExposureScore: number;
  policyCoverageScore: number;
  findingsWithSavings: AIGovernanceFinding[];
  governanceOnlyFindings: AIGovernanceFinding[];
  recommendedActions: string[];
}

export interface AIGovernanceSummary {
  aiApplicationsDetected: number;
  unapprovedAIApps: number;
  policyGaps: number;
  governanceExposureScore: number;
  potentialAnnualSavings: number;
  highRiskFindings: number;
}

export interface AIApplicationInventoryItem {
  applicationName: string;
  usersDetected: number;
  approved: boolean;
  owner?: string;
  riskLevel: AIGovernanceRiskLevel;
  policyCoverage?: boolean;
  estimatedAnnualSpend?: number;
}

export interface AIGovernanceDiscoveryResult {
  category: "AI Application Discovery & AI Governance Exposure";
  platformLayer: "Discovery → Trust → Governance → Opportunity";
  executionRequired: false;
  inventory: AIApplicationInventoryItem[];
  summary: AIGovernanceSummary;
  findings: AIGovernanceFinding[];
  opportunity: AIGovernanceOpportunityResult;
  governanceExposureScore: number;
  policyCoverageScore: number;
  evidenceRefs: string[];
}
