export type Vendor = "MICROSOFT" | "AWS" | "AZURE" | "SNOWFLAKE" | "DATABRICKS" | "SERVICENOW" | "SALESFORCE" | "ADOBE";
export type VendorChangeCategory = "PRICE_CHANGE" | "SKU_CHANGE" | "BUNDLE_CHANGE" | "FEATURE_CHANGE" | "RETIREMENT" | "POLICY_CHANGE" | "LICENSING_CHANGE";
export type VendorChangeSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type VendorChangeStatus = "NEW" | "ASSESSED" | "IMPACTED" | "ACTIONED" | "ARCHIVED";

export interface VendorChangeEvent {
  id: string;
  vendor: Vendor;
  category: VendorChangeCategory;
  title: string;
  description: string;
  effectiveDate: string;
  sourceUrl: string;
  impactSeverity: VendorChangeSeverity;
  detectedAt: string;
}

export interface StoredVendorChangeEvent extends VendorChangeEvent {
  tenantId: string;
  status: VendorChangeStatus;
  affectedSpend: number;
  generatedOpportunityCount: number;
}

export interface VendorImpactAssessment {
  changeId: string;
  tenantId: string;
  affectedUsers: number;
  affectedDepartments: string[];
  affectedSpend: number;
  monthlyCostDelta: number;
  potentialActions: Array<"Reclaim" | "Rightsize" | "Reallocate" | "Migrate" | "Renegotiate" | "Monitor">;
  evidence: string[];
  assessedAt: string;
}

export interface VendorChangeOpportunity {
  opportunityId: string;
  tenantId: string;
  changeId: string;
  recommendationSource: "VENDOR_CHANGE";
  actionType: string;
  playbookId: string;
  title: string;
  projectedMonthlySavings: number;
  affectedEntityCount: number;
  governanceRequired: boolean;
  trustPrerequisites: string[];
  createdAt: string;
}
