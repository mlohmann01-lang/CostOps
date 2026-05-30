import type { Opportunity } from "../opportunities/opportunity-types";

export type UtilizationPlatform = "M365" | "COPILOT" | "AWS" | "AZURE" | "SNOWFLAKE" | "DATABRICKS" | "SALESFORCE" | "SERVICENOW" | "ADOBE";
export type UtilizationBand = "HIGH" | "MEDIUM" | "LOW" | "UNUSED";

export interface UtilizationRecord {
  id: string;
  tenantId: string;
  platform: UtilizationPlatform;
  resourceName: string;
  assignedCount: number;
  activeCount: number;
  utilizationPercent: number;
  monthlyCost: number;
  wasteEstimate: number;
  utilizationBand: UtilizationBand;
  lastActivityAt: string;
}

export interface UtilizationInput { id: string; tenantId: string; platform: UtilizationPlatform; resourceName: string; assignedCount: number; activeCount: number; monthlyCost: number; lastActivityAt: string; }
export interface UtilizationSummary { assetsAnalysed: number; unusedValue: number; lowUtilization: number; generatedOpportunities: number; }
export interface UtilizationOpportunity extends Opportunity { source: "UTILIZATION"; utilizationRecordId: string; utilizationBand: UtilizationBand; }
