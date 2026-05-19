import type { OracleJavaSignal } from '../oracle-java-governance';
export const adaptOracleJavaToKernel = (signal: OracleJavaSignal) => ({
  domain: 'ORACLE_JAVA_GOVERNANCE',
  severity: Number((signal.entitlement.processorMetricExposure * 0.35 + signal.infrastructure.vmwareAffinityAmbiguity * 0.35 + signal.java.unsupportedRuntimeRisk * 0.3).toFixed(4)),
  confidence: Number(((signal.entitlement.entitlementEvidenceQuality + signal.infrastructure.physicalCoreAttributionConfidence + signal.java.runtimeOwnershipConfidence) / 3).toFixed(4)),
  governance: 'APPROVAL_REQUIRED' as const,
});
