import { normalizeEconomicCausalSignals } from './economic-causal-signal-normalizer';
import type { EconomicCausalSignal } from './economic-causality-types';
export const evaluateEconomicVolatilityCause=(input:EconomicCausalSignal[])=>normalizeEconomicCausalSignals(input).find((s)=>s.category==='WORKLOAD_VOLATILITY')??normalizeEconomicCausalSignals(input)[0];
