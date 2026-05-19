import type { OracleJavaSignal } from './oracle-java-types';

export const computeOracleJavaEvidenceQuality = (signal: OracleJavaSignal): number => {
  const dimensions = [
    signal.entitlement.entitlementEvidenceQuality,
    signal.entitlement.contractEvidenceConfidence,
    signal.entitlement.auditEvidenceCompleteness,
    signal.infrastructure.physicalCoreAttributionConfidence,
    signal.java.oracleJdkDetectionConfidence,
  ];
  return Number((dimensions.reduce((a, b) => a + b, 0) / dimensions.length).toFixed(4));
};
