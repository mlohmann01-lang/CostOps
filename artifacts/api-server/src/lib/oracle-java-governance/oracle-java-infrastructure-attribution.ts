import type { OracleJavaSignal } from './oracle-java-types';

export const computeOracleJavaInfrastructureAttribution = (signal: OracleJavaSignal): { risk: number; reasons: string[] } => {
  const reasons: string[] = [];
  if (signal.infrastructure.hardPartitionEvidenceConfidence < 0.5) reasons.push('hard partition evidence ambiguity');
  if (signal.infrastructure.vmwareAffinityAmbiguity > 0.6) reasons.push('VMware affinity ambiguity');
  if (signal.infrastructure.cloudBYOLAmbiguity > 0.6) reasons.push('cloud BYOL ambiguity');
  if (signal.infrastructure.DRRoleAmbiguity > 0.6) reasons.push('DR role ambiguity');
  const risk = Number(((signal.infrastructure.softPartitionRisk + signal.infrastructure.vmwareAffinityAmbiguity + signal.infrastructure.cloudBYOLAmbiguity + signal.infrastructure.DRRoleAmbiguity) / 4).toFixed(4));
  return { risk, reasons };
};
