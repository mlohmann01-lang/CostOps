import type { OracleJavaSignal } from '../lib/oracle-java-governance';

export const buildOracleJavaSignalFixture = (): OracleJavaSignal => ({
  tenantId: 't1',
  evidence: [{ id: 'ev-1', source: 'kubernetes-economics', capturedAt: '2026-01-01T00:00:00.000Z', confidence: 0.8, lineage: { lineageId: 'l1', sourceSystem: 'test', entityId: 't1' }, replay: { replayId: 'r1', timestamp: '2026-01-01T00:00:00.000Z', version: 'v1' } }],
  entitlement: { entitlementEvidenceQuality: 0.5, contractEvidenceConfidence: 0.5, entitlementCoverageRatio: 0.55, productMetricAlignment: 0.6, processorMetricExposure: 0.7, namedUserPlusExposure: 0.3, supportStatusConfidence: 0.65, auditEvidenceCompleteness: 0.45 },
  infrastructure: { physicalCoreAttributionConfidence: 0.55, virtualizationBoundaryConfidence: 0.5, hardPartitionEvidenceConfidence: 0.4, softPartitionRisk: 0.75, vmwareAffinityAmbiguity: 0.7, cloudBYOLAmbiguity: 0.65, DRRoleAmbiguity: 0.7, clusterMobilityRisk: 0.6, hostOwnershipConfidence: 0.6 },
  java: { oracleJdkDetectionConfidence: 0.8, openJdkAlternativeConfidence: 0.3, javaSeSubscriptionExposure: 0.8, employeeMetricExposure: 0.75, runtimeVersionRisk: 0.7, unsupportedRuntimeRisk: 0.78, commercialFeatureExposure: 0.55, containerizedRuntimeExposure: 0.73, kubernetesJvmDensity: 0.84, inactiveRuntimeWaste: 0.5, runtimeOwnershipConfidence: 0.45 },
  exposure: { estimatedMonthlyExposure: 120000, estimatedAnnualExposure: 1440000, auditBackExposureRisk: 0.8, renewalNegotiationRisk: 0.62, recurrenceRisk: 0.7, executiveMateriality: 0.81 },
});
