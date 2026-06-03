export type RenewalFindingType =
  | "UPCOMING_RENEWAL"
  | "HIGH_COST_LOW_USAGE_RENEWAL"
  | "DUPLICATE_VENDOR_RENEWAL"
  | "OWNER_GAP"
  | "MISSING_USAGE_DATA"
  | "MISSING_COST_DATA"
  | "NEGOTIATION_OPPORTUNITY"
  | "RETIREMENT_CANDIDATE"
  | "CONSOLIDATION_BEFORE_RENEWAL";

export type RenewalRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RenewalRecommendation = "RENEW" | "RENEGOTIATE" | "REDUCE" | "CONSOLIDATE" | "RETIRE" | "INVESTIGATE";
export type RenewalTrustBand = "HIGH" | "MEDIUM" | "LOW" | "BLOCKED";
export type RenewalSavingsConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface RenewalContractInput {
  id: string;
  vendorName: string;
  applicationName: string;
  capabilityCategory?: string;
  owner?: string;
  annualCost?: number;
  assignedUsers?: number;
  activeUsers?: number;
  utilisationRate?: number;
  renewalDate?: string;
  approved?: boolean;
  duplicateWith?: string[];
  evidenceRefs?: string[];
}

export interface RenewalFinding {
  id: string;
  vendorName: string;
  applicationName: string;
  findingType: RenewalFindingType;
  riskLevel: RenewalRiskLevel;
  recommendation: RenewalRecommendation;
  renewalDate?: string;
  daysToRenewal?: number;
  annualCost?: number;
  assignedUsers?: number;
  activeUsers?: number;
  utilisationRate?: number;
  owner?: string;
  duplicateWith?: string[];
  potentialAnnualSavings?: number;
  trustScore: number;
  rationale: string;
  recommendedAction: string;
  evidenceRefs: string[];
}

export interface RenewalContractDiscoveryInput {
  tenantId?: string;
  asOfDate?: string;
  contracts: RenewalContractInput[];
}

export interface RenewalTrustInput {
  ownerKnown: boolean;
  renewalDateKnown: boolean;
  annualCostKnown: boolean;
  assignedUsersKnown: boolean;
  activeUsersKnown: boolean;
  utilisationKnown: boolean;
  duplicateDataKnown: boolean;
  evidenceRefsAvailable: boolean;
}

export interface RenewalTrustResult {
  trustScore: number;
  trustBand: RenewalTrustBand;
  reasons: string[];
}

export interface RenewalOpportunityResult {
  totalPotentialAnnualSavings: number;
  savingsConfidence: RenewalSavingsConfidence;
  findingsWithSavings: RenewalFinding[];
  governanceOnlyFindings: RenewalFinding[];
  upcomingRenewals: RenewalFinding[];
  topRenewalActions: string[];
  evidenceRefs: string[];
}

export interface RenewalCalendarWindow {
  label: "0–30 days" | "31–60 days" | "61–90 days" | "91–120 days" | "121–180 days";
  findings: RenewalFinding[];
}

export interface RenewalContractSummary {
  upcomingRenewals: number;
  annualSpendReviewed: number;
  potentialAnnualSavings: number;
  highRiskRenewals: number;
  contractsMissingOwner: number;
  negotiationOpportunities: number;
}

export interface RenewalContractResult {
  category: "Renewal & Contract Intelligence";
  platformLayer: "Discovery → Trust → Renewal Risk → Contract Opportunity → Evidence";
  executionRequired: false;
  summary: RenewalContractSummary;
  findings: RenewalFinding[];
  opportunity: RenewalOpportunityResult;
  upcomingRenewals: RenewalFinding[];
  renewalCalendar: RenewalCalendarWindow[];
  riskBreakdown: Record<RenewalRiskLevel, number>;
  evidenceRefs: string[];
}
