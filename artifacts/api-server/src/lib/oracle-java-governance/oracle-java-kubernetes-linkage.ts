import type { OracleJavaSignal } from './oracle-java-types';

export const computeOracleJavaKubernetesLinkage = (signal: OracleJavaSignal): { linkedEvidenceIds: string[]; linkageRisk: number } => ({
  linkedEvidenceIds: signal.evidence.filter((e) => e.source.toLowerCase().includes('kubernetes')).map((e) => e.id),
  linkageRisk: Number((signal.java.containerizedRuntimeExposure * signal.java.kubernetesJvmDensity).toFixed(4)),
});
