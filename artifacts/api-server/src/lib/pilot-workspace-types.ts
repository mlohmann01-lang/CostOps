export type PilotWorkspaceMode = "DEMO" | "LIVE";
export type ReadinessStatus =
  | "READY"
  | "PARTIAL"
  | "MISSING"
  | "BLOCKED"
  | "DEMO";
export type SummaryStatus = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
export interface PilotWorkspaceSummary {
  tenantId: string;
  mode: PilotWorkspaceMode;
  generatedAt: string;
  tenantReadiness: {
    overallStatus: ReadinessStatus;
    items: Array<{
      key: string;
      label: string;
      status: ReadinessStatus;
      score?: number;
      reason?: string;
      nextStep?: string;
    }>;
  };
  executiveValue: {
    projectedValue?: number;
    approvedValue?: number;
    executedValue?: number;
    financeVerifiedValue?: number;
    varianceAmount?: number;
    variancePercent?: number;
    currency?: string;
    confidence: Confidence;
    status: SummaryStatus;
  };
  commercialPosition: {
    vendorCount: number;
    contractCount: number;
    entitlementCount: number;
    commitmentCount: number;
    renewalCount: number;
    commercialExposureValue?: number;
    blockedSavingsValue?: number;
    renewalLeverage?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNAVAILABLE";
    status: SummaryStatus;
  };
  financialTruth: {
    costCentreCount: number;
    invoiceCount: number;
    purchaseOrderCount: number;
    vendorSpendCount: number;
    reconciliationCount: number;
    verifiedSavings?: number;
    unverifiedSavings?: number;
    status: SummaryStatus;
  };
  ownershipCoverage: {
    completenessScore?: number;
    missingOwners: number;
    missingCostCentres: number;
    missingExecutiveOwners: number;
    approvalRoutesReady: number;
    approvalRoutesBlocked: number;
    status: SummaryStatus;
  };
  actionSnapshot: {
    ready: number;
    awaitingApproval: number;
    scheduled: number;
    completed: number;
    blocked: number;
    status: SummaryStatus;
  };
  evidenceTrust: {
    evidencePackCount: number;
    evidenceCoverageScore?: number;
    trustReadinessScore?: number;
    financeEvidenceCount?: number;
    outcomeEvidenceCount?: number;
    status: SummaryStatus;
  };
  technologyPortfolio?: { assetCount: number; vendorCount: number; productCount: number; applicationCount: number; totalAnnualSpend?: number; financeVerifiedSavings?: number; riskCount: number; criticalRiskCount: number; missingOwnerCount: number; missingCostCentreCount: number; renewalRiskCount: number; portfolioReadiness: string; nextStep: string; status: SummaryStatus; };
  graphHealth: {
    nodeCount: number;
    edgeCount: number;
    economicControlChainAudit: "PASS" | "WARN" | "FAIL" | "UNAVAILABLE";
    disconnectedCriticalObjects?: number;
    status: SummaryStatus;
  };
  demoBanner?: { visible: boolean; label: string; description: string };
  nextSteps: Array<{
    priority: "HIGH" | "MEDIUM" | "LOW";
    title: string;
    description: string;
    targetArea:
      | "CONNECTORS"
      | "COMMERCIAL"
      | "FINANCIAL_TRUTH"
      | "OWNERSHIP"
      | "ACTIONS"
      | "EVIDENCE"
      | "GRAPH"
      | "GOVERNANCE";
  }>;
}
