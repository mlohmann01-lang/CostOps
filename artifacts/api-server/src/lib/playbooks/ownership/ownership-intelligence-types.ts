export type OwnershipGapType =
  | "NO_BUSINESS_OWNER"
  | "NO_TECHNICAL_OWNER"
  | "NO_BUDGET_OWNER"
  | "NO_RENEWAL_OWNER"
  | "NO_EXECUTIVE_SPONSOR"
  | "UNKNOWN_COST_CENTRE"
  | "OWNER_STALE"
  | "OWNER_CONFLICT";

export type OwnershipRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OwnershipStatus = "OWNED" | "PARTIALLY_OWNED" | "OWNERLESS" | "CONFLICTED" | "STALE";
export type OwnershipRecommendation = "ASSIGN_OWNER" | "CONFIRM_OWNER" | "RESOLVE_CONFLICT" | "ASSIGN_BUDGET_OWNER" | "ASSIGN_RENEWAL_OWNER" | "ESCALATE_TO_EXECUTIVE" | "INVESTIGATE";
export type OwnershipSourceContext = "M365" | "SHADOW_IT" | "SAAS_RATIONALISATION" | "AI_GOVERNANCE" | "RENEWALS" | "MANUAL";
export type OwnershipTrustBand = "HIGH" | "MEDIUM" | "LOW" | "BLOCKED";

export interface OwnershipInput {
  id: string;
  vendorName: string;
  applicationName: string;
  capabilityCategory?: string;
  businessOwner?: string;
  technicalOwner?: string;
  budgetOwner?: string;
  renewalOwner?: string;
  executiveSponsor?: string;
  costCentre?: string;
  ownerLastConfirmedDays?: number;
  annualCost?: number;
  renewalDate?: string;
  activeUsers?: number;
  riskSignals?: string[];
  sourceContext?: OwnershipSourceContext[];
  evidenceRefs?: string[];
}

export interface OwnershipFinding {
  id: string;
  vendorName: string;
  applicationName: string;
  ownershipStatus: OwnershipStatus;
  gapType: OwnershipGapType;
  riskLevel: OwnershipRiskLevel;
  recommendation: OwnershipRecommendation;
  businessOwner?: string;
  technicalOwner?: string;
  budgetOwner?: string;
  renewalOwner?: string;
  executiveSponsor?: string;
  costCentre?: string;
  annualCost?: number;
  renewalDate?: string;
  activeUsers?: number;
  sourceContext: string[];
  trustScore: number;
  rationale: string;
  recommendedAction: string;
  evidenceRefs: string[];
}

export interface OwnershipDiscoveryInput { tenantId?: string; asOfDate?: string; applications: OwnershipInput[]; }
export interface OwnershipTrustInput { businessOwnerKnown:boolean; technicalOwnerKnown:boolean; budgetOwnerKnown:boolean; renewalOwnerKnown:boolean; executiveSponsorKnown:boolean; costCentreKnown:boolean; ownerRecentlyConfirmed:boolean; evidenceRefsAvailable:boolean; sourceContextAvailable:boolean; }
export interface OwnershipTrustResult { trustScore:number; trustBand:OwnershipTrustBand; reasons:string[]; }
export interface OwnershipOpportunityResult { applicationsReviewed:number; ownerlessApplications:number; partiallyOwnedApplications:number; conflictedOwners:number; staleOwners:number; annualSpendWithoutOwner:number; renewalsWithoutOwner:number; aiApplicationsWithoutOwner:number; highRiskOwnershipFindings:number; recommendedActions:string[]; evidenceRefs:string[]; }
export interface OwnershipSummary extends OwnershipOpportunityResult {}
export interface OwnershipResult { category:"Vendor & Application Ownership Intelligence"; platformLayer:"Discovery → Trust → Ownership Gap Detection → Accountability Risk → Opportunity / Remediation Action → Evidence"; executionRequired:false; summary:OwnershipSummary; findings:OwnershipFinding[]; opportunity:OwnershipOpportunityResult; ownershipStatusBreakdown:Record<OwnershipStatus, number>; accountabilityRiskScore:number; evidenceRefs:string[]; }
