import type { Vendor } from "../vcde/vendor-change-types";
import type { Opportunity } from "../opportunities/opportunity-types";

export type RenewalRisk = "LOW" | "MEDIUM" | "HIGH";
export type NegotiationLeverage = "LOW" | "MEDIUM" | "HIGH";

export interface Renewal {
  id: string;
  tenantId: string;
  vendor: Vendor;
  contractName: string;
  renewalDate: string;
  annualSpend: number;
  renewalRisk: RenewalRisk;
  daysRemaining: number;
}

export interface RenewalReadiness {
  renewalId: string;
  readinessScore: number;
  wasteIdentified: number;
  recoverableSpend: number;
  projectedSavings: number;
  recommendedActions: number;
  negotiationLeverage: NegotiationLeverage;
}

export interface RenewalOpportunity extends Opportunity {
  source: "RENEWAL";
  renewalId: string;
  negotiationLeverage: NegotiationLeverage;
}

export interface RenewalSummary {
  upcomingRenewals: number;
  renewalSpend: number;
  recoverable: number;
  highRisk: number;
}
