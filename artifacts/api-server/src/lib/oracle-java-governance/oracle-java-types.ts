import type { EconomicGovernanceClassification } from '../economic-intelligence-kernel';
import type { EconomicEvidenceReference } from '../semantic-hardening';

export type ExposureBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OracleEntitlementDimensions {
  entitlementEvidenceQuality: number;
  contractEvidenceConfidence: number;
  entitlementCoverageRatio: number;
  productMetricAlignment: number;
  processorMetricExposure: number;
  namedUserPlusExposure: number;
  supportStatusConfidence: number;
  auditEvidenceCompleteness: number;
}

export interface OracleInfrastructureDimensions {
  physicalCoreAttributionConfidence: number;
  virtualizationBoundaryConfidence: number;
  hardPartitionEvidenceConfidence: number;
  softPartitionRisk: number;
  vmwareAffinityAmbiguity: number;
  cloudBYOLAmbiguity: number;
  DRRoleAmbiguity: number;
  clusterMobilityRisk: number;
  hostOwnershipConfidence: number;
}

export interface JavaDimensions {
  oracleJdkDetectionConfidence: number;
  openJdkAlternativeConfidence: number;
  javaSeSubscriptionExposure: number;
  employeeMetricExposure: number;
  runtimeVersionRisk: number;
  unsupportedRuntimeRisk: number;
  commercialFeatureExposure: number;
  containerizedRuntimeExposure: number;
  kubernetesJvmDensity: number;
  inactiveRuntimeWaste: number;
  runtimeOwnershipConfidence: number;
}

export interface OracleJavaEconomicExposure {
  estimatedMonthlyExposure: number;
  estimatedAnnualExposure: number;
  auditBackExposureRisk: number;
  renewalNegotiationRisk: number;
  recurrenceRisk: number;
  executiveMateriality: number;
}

export interface OracleJavaSignal {
  tenantId: string;
  evidence: EconomicEvidenceReference[];
  entitlement: OracleEntitlementDimensions;
  infrastructure: OracleInfrastructureDimensions;
  java: JavaDimensions;
  exposure: OracleJavaEconomicExposure;
}

export interface OracleJavaRiskOutput {
  riskScore: number;
  confidenceScore: number;
  exposureBand: ExposureBand;
  governanceClass: EconomicGovernanceClassification | 'BLOCKED';
  riskReasons: string[];
  evidenceGaps: string[];
  recommendedReviewMode: 'READ_ONLY' | 'RECOMMEND_ONLY' | 'APPROVAL_REQUIRED';
}
