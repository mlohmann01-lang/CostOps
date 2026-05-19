import type { OracleJavaRiskOutput } from './oracle-java-types';

const categories = [
  'ORACLE_ENTITLEMENT_REVIEW','ORACLE_PROCESSOR_EXPOSURE_REVIEW','ORACLE_VMWARE_AFFINITY_REVIEW','ORACLE_CLOUD_BYOL_REVIEW','ORACLE_DR_ENVIRONMENT_REVIEW','ORACLE_AUDIT_RISK_REVIEW','JAVA_RUNTIME_SUBSCRIPTION_REVIEW','JAVA_VERSION_GOVERNANCE_REVIEW','JAVA_CONTAINER_EXPOSURE_REVIEW','JAVA_INACTIVE_RUNTIME_REVIEW','JAVA_OWNERSHIP_REVIEW',
] as const;

export const generateOracleJavaRecommendations = (risk: OracleJavaRiskOutput): string[] => {
  if (risk.riskScore < 0.35) return ['ORACLE_ENTITLEMENT_REVIEW'];
  if (risk.governanceClass === 'BLOCKED') return [...categories];
  return categories.filter((c) => {
    if (c.includes('VMWARE')) return risk.riskReasons.some((r) => r.includes('VMware'));
    if (c.includes('BYOL')) return risk.riskReasons.some((r) => r.includes('BYOL'));
    if (c.includes('DR_')) return risk.riskReasons.some((r) => r.includes('DR role'));
    return true;
  });
};
