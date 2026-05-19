import { normalizeEconomicCausalSignals } from './economic-causal-signal-normalizer';
import type { EconomicCausalSignal } from './economic-causality-types';
export function buildEconomicCausalGraph(input:EconomicCausalSignal[]){const signals=normalizeEconomicCausalSignals(input); return {nodes:signals.map((s)=>s.category),edges:signals.slice(1).map((s)=>({from:signals[0].category,to:s.category,weight:s.strength}))};}
