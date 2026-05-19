import type { EconomicCausalSignal } from './economic-causality-types';
export function normalizeEconomicCausalSignals(input:EconomicCausalSignal[]):EconomicCausalSignal[]{return [...input].map((s)=>({...s,strength:Math.max(0,Math.min(1,s.strength))})).sort((a,b)=>b.strength-a.strength);}
