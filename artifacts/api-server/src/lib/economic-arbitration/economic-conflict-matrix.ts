export type EconomicConflictType =
  | 'CLOUD_SAVINGS_VS_AI_ELASTICITY'
  | 'GPU_EFFICIENCY_VS_LATENCY'
  | 'COMMITMENT_UTILIZATION_VS_VOLATILITY'
  | 'KUBERNETES_EFFICIENCY_VS_RESILIENCE'
  | 'LICENCE_REDUCTION_VS_AUDIT_RISK'
  | 'SAVINGS_VS_LOW_CONFIDENCE'
  | 'EXECUTIVE_MATERIALITY_VS_AUTOMATION'
  | 'ORACLE_EXPOSURE_VS_INFRA_COST';

export const classifyEconomicConflict = (signal: string): EconomicConflictType => {
  const key = signal.toUpperCase();
  if (key.includes('AI_ELASTICITY')) return 'CLOUD_SAVINGS_VS_AI_ELASTICITY';
  if (key.includes('LATENCY')) return 'GPU_EFFICIENCY_VS_LATENCY';
  if (key.includes('VOLATILITY')) return 'COMMITMENT_UTILIZATION_VS_VOLATILITY';
  if (key.includes('RESILIENCE')) return 'KUBERNETES_EFFICIENCY_VS_RESILIENCE';
  if (key.includes('AUDIT')) return 'LICENCE_REDUCTION_VS_AUDIT_RISK';
  if (key.includes('LOW_CONFIDENCE')) return 'SAVINGS_VS_LOW_CONFIDENCE';
  if (key.includes('EXECUTIVE')) return 'EXECUTIVE_MATERIALITY_VS_AUTOMATION';
  return 'ORACLE_EXPOSURE_VS_INFRA_COST';
};
