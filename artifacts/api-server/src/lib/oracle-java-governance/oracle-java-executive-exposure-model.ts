import type { OracleJavaSignal } from './oracle-java-types';

export const computeOracleJavaExecutiveExposure = (signal: OracleJavaSignal): number => {
  const materiality = signal.exposure.executiveMateriality;
  const employeeMetric = signal.java.employeeMetricExposure;
  const oracleJdk = signal.java.oracleJdkDetectionConfidence;
  return Number((materiality * 0.5 + employeeMetric * 0.25 + oracleJdk * 0.25).toFixed(4));
};
