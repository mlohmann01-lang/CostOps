import type { ExposureBand, OracleJavaEconomicExposure } from './oracle-java-types';

export const classifyExposureBand = (monthlyExposure: number): ExposureBand => {
  if (monthlyExposure >= 250000) return 'CRITICAL';
  if (monthlyExposure >= 100000) return 'HIGH';
  if (monthlyExposure >= 25000) return 'MEDIUM';
  return 'LOW';
};

export const computeOracleJavaEconomicExposure = (input: OracleJavaEconomicExposure): OracleJavaEconomicExposure => ({
  ...input,
  estimatedAnnualExposure: Number((input.estimatedMonthlyExposure * 12).toFixed(2)),
});
