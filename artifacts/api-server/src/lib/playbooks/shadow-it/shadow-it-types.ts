export type ShadowITFindingType =
  | "UNKNOWN_APPLICATION"
  | "UNAPPROVED_APPLICATION"
  | "AI_APPLICATION"
  | "DUPLICATE_CAPABILITY"
  | "ORPHANED_APPLICATION"
  | "DORMANT_APPLICATION"
  | "HIGH_RISK_APPLICATION";

export type ShadowITRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ShadowITTrustBand = "TRUSTED" | "HIGH" | "INVESTIGATE" | "LOW_CONFIDENCE" | "BLOCKED";

export type ShadowITOpportunityConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface ShadowITFinding {
  id: string;
  applicationName: string;
  findingType: ShadowITFindingType;
  riskLevel: ShadowITRiskLevel;
  userCount: number;
  owner?: string;
  category?: string;
  annualCostEstimate?: number;
  trustScore: number;
  rationale: string;
  recommendedAction: string;
  evidenceRefs: string[];
}

export interface ShadowITApplicationInput {
  id: string;
  applicationName: string;
  approved?: boolean;
  userCount?: number;
  owner?: string | null;
  category?: string;
  annualCostEstimate?: number;
  estimatedSeatCost?: number;
  lastActivityDays?: number;
  permissions?: string[];
  riskSignals?: string[];
}

export interface ShadowITOAuthApplicationInput extends ShadowITApplicationInput {
  oauthAppId?: string;
  consentType?: "ADMIN" | "USER" | "UNKNOWN";
}

export interface ShadowITSignInEventInput {
  id: string;
  applicationId?: string;
  applicationName: string;
  userId?: string;
  occurredAt?: string;
}

export interface ShadowITDiscoveryInput {
  tenantId?: string;
  enterpriseApplications?: ShadowITApplicationInput[];
  oauthApplications?: ShadowITOAuthApplicationInput[];
  signInEvents?: ShadowITSignInEventInput[];
}

export interface ShadowITTrustInput {
  ownerKnown: boolean;
  signInEvidenceAvailable: boolean;
  userCountAvailable: boolean;
  applicationMetadataAvailable: boolean;
}

export interface ShadowITTrustResult {
  trustScore: number;
  trustBand: ShadowITTrustBand;
  trustReasons: string[];
}

export interface ShadowITOpportunity {
  id: string;
  findingId: string;
  applicationName: string;
  findingType: ShadowITFindingType;
  potentialAnnualSavings?: number;
  confidence: ShadowITOpportunityConfidence;
  opportunityType: "RATIONALIZATION" | "DUPLICATE_CONSOLIDATION" | "GOVERNANCE_EXPOSURE";
  rationale: string;
  evidenceRefs: string[];
}

export interface ShadowITDashboardTile {
  title: "Shadow IT Exposure";
  applicationsDiscovered: number;
  unknownApplications: number;
  aiApplications: number;
  duplicateCapabilityFindings: number;
  potentialAnnualSavings: number;
  governanceExposureScore: number;
}

export interface ShadowITDiscoveryResult {
  category: "Shadow IT Discovery & Exposure Intelligence";
  platformLayer: "Discovery → Trust → Opportunity";
  executionRequired: false;
  findings: ShadowITFinding[];
  opportunities: ShadowITOpportunity[];
  dashboardTile: ShadowITDashboardTile;
}
