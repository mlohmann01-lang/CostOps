import type { OracleJavaSignal } from './oracle-java-types';

const clamp = (n: number): number => Math.max(0, Math.min(1, Number(n.toFixed(4))));

export const computeOracleJavaRiskConfidence = (signal: OracleJavaSignal): number => {
  const base = [
    signal.entitlement.entitlementEvidenceQuality,
    signal.entitlement.contractEvidenceConfidence,
    signal.entitlement.auditEvidenceCompleteness,
    signal.infrastructure.physicalCoreAttributionConfidence,
    signal.infrastructure.hardPartitionEvidenceConfidence,
    signal.infrastructure.hostOwnershipConfidence,
    signal.java.oracleJdkDetectionConfidence,
    signal.java.runtimeOwnershipConfidence,
  ].reduce((sum, v) => sum + v, 0) / 8;

  const ambiguityPenalty = (
    signal.infrastructure.vmwareAffinityAmbiguity +
    signal.infrastructure.cloudBYOLAmbiguity +
    signal.infrastructure.DRRoleAmbiguity
  ) / 3;

  return clamp(base * 0.85 + (1 - ambiguityPenalty) * 0.15);
};
