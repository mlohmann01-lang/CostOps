export type TrustBand = "TRUSTED" | "HIGH" | "INVESTIGATE" | "LOW_CONFIDENCE" | "BLOCKED";

export type TrustDimension =
  | "completeness"
  | "consistency"
  | "freshness"
  | "sourceReliability"
  | "identityConfidence"
  | "ownershipClarity"
  | "financialLinkage"
  | "usageEvidence"
  | "entitlementConfidence"
  | "executionSafety";

export type TrustScore = {
  score: number;
  band: TrustBand;
  label: string;
  reasons: string[];
  dimensions?: Partial<Record<TrustDimension, number>>;
};

export type TrustFindingType =
  | "IDENTITY_CONFLICT"
  | "MISSING_OWNER"
  | "STALE_SOURCE"
  | "CONNECTOR_DEGRADED"
  | "MISSING_USAGE_EVIDENCE"
  | "ENTITLEMENT_CONFLICT"
  | "UNKNOWN_COST_CENTRE"
  | "POLICY_BLOCKED";

export type TrustFindingSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TrustFindingStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "SUPPRESSED";

export type TrustFinding = {
  findingId: string;
  tenantId: string;
  findingType: TrustFindingType;
  severity: TrustFindingSeverity;
  entityType: string;
  entityId: string;
  sourceSystem: string;
  description: string;
  affectedRecommendationIds: string[];
  affectedValue: number;
  status: TrustFindingStatus;
  remediationHint: string;
  detectedAt: string;
};

export type ReadinessCategory = "EXECUTION_ELIGIBLE" | "APPROVAL_REQUIRED" | "BLOCKED_BY_TRUST" | "BLOCKED_BY_POLICY" | "MANUAL_ONLY";

export type ExecutionReadinessBreakdownRow = {
  category: ReadinessCategory;
  label: string;
  value: number;
  recommendationCount: number;
  reasons: string[];
};

export type ExecutionReadinessRollup = {
  executionEligibleValue: number;
  approvalRequiredValue: number;
  blockedByTrustValue: number;
  blockedByPolicyValue: number;
  manualOnlyValue: number;
  breakdown: ExecutionReadinessBreakdownRow[];
};

export type TrustSummary = ExecutionReadinessRollup & {
  tenantId: string;
  globalTrustScore: number;
  globalTrustBand: TrustBand;
  globalTrustLabel: string;
  globalTrustReasons: string[];
  trustIssueCount: number;
  identityConflictCount: number;
  missingOwnerCount: number;
  staleSourceCount: number;
  connectorDegradedCount: number;
  generatedAt: string;
};

export type ConnectorTrustRow = {
  connectorId: string;
  connectorName: string;
  platform: string;
  trustScore: number;
  trustBand: TrustBand;
  trustLabel: string;
  trustReasons: string[];
  status: string;
  lastSyncAt: string | null;
  freshnessStatus: string;
  identityIssues: number;
  missingOwnership: number;
  staleRecords: number;
  blockedRecommendationCount: number;
  affectedValue: number;
};

export type TrustRecommendation = {
  recommendationId: string;
  tenantId: string;
  connector?: string | null;
  sourceSystem?: string | null;
  executionReadiness: string;
  recommendationState?: string | null;
  projectedMonthlySavings?: number | null;
  projectedAnnualSavings?: number | null;
  blockedReasons?: string[];
  readinessReasons?: string[];
  evidencePointers?: string[];
  targetEntityId?: string | null;
};

export type ConnectorRuntimeSignal = {
  connectorId: string;
  connectorName: string;
  platform: string;
  status: string;
  lastSyncAt?: string | null;
  freshnessStatus?: string | null;
  dataFreshnessScore?: number | null;
  trustScore?: number | null;
  trustReasons?: string[];
};
