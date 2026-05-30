import type { Opportunity } from "../opportunities/opportunity-types";
import type { Vendor } from "../vcde/vendor-change-types";

export type ContractVendor = Extract<Vendor, "MICROSOFT" | "AWS" | "SNOWFLAKE" | "SERVICENOW" | "SALESFORCE" | "ADOBE">;
export type ContractRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Contract {
  id: string;
  tenantId: string;
  vendor: ContractVendor;
  contractName: string;
  startDate: string;
  endDate: string;
  annualValue: number;
  autoRenew: boolean;
  commitmentValue: number;
  unusedValue: number;
  riskLevel: ContractRiskLevel;
}

export interface ContractIntelligence {
  contractId: string;
  unusedSpend: number;
  commitmentExposure: number;
  renewalRisk: ContractRiskLevel;
  priceIncreaseExposure: number;
  autoRenewalExposure: number;
  trueUpExposure: number;
}

export interface ContractOpportunity extends Opportunity {
  source: "CONTRACT";
  contractId: string;
  riskLevel: ContractRiskLevel;
}

export interface ContractSummary {
  contracts: number;
  atRisk: number;
  unusedValue: number;
  generatedOpportunities: number;
}
