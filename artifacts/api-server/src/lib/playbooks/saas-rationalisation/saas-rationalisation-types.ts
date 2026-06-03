export type SaaSRationalisationFindingType =
  | "DUPLICATE_CAPABILITY"
  | "UNDERUSED_VENDOR"
  | "DORMANT_VENDOR"
  | "UNMANAGED_VENDOR"
  | "OWNER_GAP"
  | "RENEWAL_RISK"
  | "HIGH_COST_LOW_USAGE"
  | "CONSOLIDATION_CANDIDATE";

export type SaaSRationalisationRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SaaSCapabilityCategory =
  | "COLLABORATION"
  | "COMMUNICATION"
  | "PROJECT_MANAGEMENT"
  | "DESIGN"
  | "DOCUMENT_STORAGE"
  | "AI_PRODUCTIVITY"
  | "CRM"
  | "MARKETING"
  | "ANALYTICS"
  | "FINANCE"
  | "SECURITY"
  | "OTHER";

export type SaaSRationalisationTrustBand = "HIGH" | "MEDIUM" | "LOW" | "BLOCKED";
export type SaaSRationalisationSavingsConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface SaaSRationalisationFinding {
  id: string;
  vendorName: string;
  applicationName: string;
  findingType: SaaSRationalisationFindingType;
  riskLevel: SaaSRationalisationRiskLevel;
  capabilityCategory: SaaSCapabilityCategory;
  overlapGroup?: string;
  usersAssigned?: number;
  activeUsers?: number;
  utilisationRate?: number;
  owner?: string;
  annualCostEstimate?: number;
  potentialAnnualSavings?: number;
  trustScore: number;
  rationale: string;
  recommendedAction: string;
  evidenceRefs: string[];
}

export interface SaaSApplicationInput {
  id: string;
  vendorName: string;
  applicationName: string;
  capabilityCategory: SaaSCapabilityCategory;
  owner?: string;
  approved?: boolean;
  usersAssigned?: number;
  activeUsers?: number;
  annualCostEstimate?: number;
  lastActivityDays?: number;
  renewalDate?: string;
  evidenceRefs?: string[];
}

export interface SaaSRationalisationInput {
  tenantId?: string;
  asOfDate?: string;
  applications: SaaSApplicationInput[];
}

export interface SaaSRationalisationTrustInput {
  ownerKnown: boolean;
  assignedUserCountKnown: boolean;
  activeUserCountKnown: boolean;
  annualCostKnown: boolean;
  renewalDateKnown: boolean;
  evidenceRefsAvailable: boolean;
  approvedStatusKnown: boolean;
}

export interface SaaSRationalisationTrustResult {
  trustScore: number;
  trustBand: SaaSRationalisationTrustBand;
  reasons: string[];
}

export interface SaaSRationalisationOpportunitySummary {
  totalPotentialAnnualSavings: number;
  savingsConfidence: SaaSRationalisationSavingsConfidence;
  findingsWithSavings: SaaSRationalisationFinding[];
  governanceOnlyFindings: SaaSRationalisationFinding[];
  topRationalisationActions: string[];
  evidenceRefs: string[];
}

export interface SaaSOverlapGroup {
  id: string;
  capabilityCategory: SaaSCapabilityCategory;
  displayName: string;
  applications: Array<{
    vendorName: string;
    applicationName: string;
    approved?: boolean;
    status: "approved" | "active" | "underused" | "unmanaged" | "dormant";
    usersAssigned?: number;
    activeUsers?: number;
  }>;
}

export interface SaaSRationalisationSummary {
  applicationsReviewed: number;
  overlapGroups: number;
  duplicateCapabilityFindings: number;
  potentialAnnualSavings: number;
  governanceFindings: number;
  renewalRisks: number;
}

export interface SaaSRationalisationResult {
  category: "SaaS Rationalisation / Vendor Overlap Intelligence";
  platformLayer: "Discovery → Trust → Rationalisation Findings → Vendor Overlap Intelligence → Opportunity → Evidence";
  executionRequired: false;
  summary: SaaSRationalisationSummary;
  findings: SaaSRationalisationFinding[];
  opportunity: SaaSRationalisationOpportunitySummary;
  overlapGroups: SaaSOverlapGroup[];
  governanceExposureScore: number;
  evidenceRefs: string[];
}
