import type { OracleJavaSignal } from '../oracle-java-governance';

export const buildGoldenPathOracleJavaFixture = (): OracleJavaSignal => ({
  tenantId: 'tenant-golden',
  evidence: [{ id: 'k8s-jvm-1', source: 'kubernetes-economics', capturedAt: '2026-01-01T00:00:00.000Z', confidence: 0.81, lineage: { lineageId: 'l-oj', sourceSystem: 'golden-path', entityId: 'tenant-golden' }, replay: { replayId: 'r-oj', timestamp: '2026-01-01T00:00:00.000Z', version: 'v1' } }],
  entitlement: { entitlementEvidenceQuality: 0.55, contractEvidenceConfidence: 0.52, entitlementCoverageRatio: 0.58, productMetricAlignment: 0.61, processorMetricExposure: 0.69, namedUserPlusExposure: 0.4, supportStatusConfidence: 0.66, auditEvidenceCompleteness: 0.5 },
  infrastructure: { physicalCoreAttributionConfidence: 0.54, virtualizationBoundaryConfidence: 0.48, hardPartitionEvidenceConfidence: 0.41, softPartitionRisk: 0.72, vmwareAffinityAmbiguity: 0.74, cloudBYOLAmbiguity: 0.71, DRRoleAmbiguity: 0.67, clusterMobilityRisk: 0.62, hostOwnershipConfidence: 0.59 },
  java: { oracleJdkDetectionConfidence: 0.8, openJdkAlternativeConfidence: 0.37, javaSeSubscriptionExposure: 0.76, employeeMetricExposure: 0.73, runtimeVersionRisk: 0.63, unsupportedRuntimeRisk: 0.79, commercialFeatureExposure: 0.58, containerizedRuntimeExposure: 0.75, kubernetesJvmDensity: 0.82, inactiveRuntimeWaste: 0.56, runtimeOwnershipConfidence: 0.47 },
  exposure: { estimatedMonthlyExposure: 138000, estimatedAnnualExposure: 1656000, auditBackExposureRisk: 0.79, renewalNegotiationRisk: 0.66, recurrenceRisk: 0.72, executiveMateriality: 0.78 },
});
