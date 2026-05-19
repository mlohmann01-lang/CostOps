import type { ArbitrationCandidate } from './economic-arbitration-types'; import { evaluateEconomicPriority } from './economic-priority-model';
export const evaluateEconomicTradeoffs=(input:ArbitrationCandidate[])=>[...input].sort((a,b)=>evaluateEconomicPriority(b)-evaluateEconomicPriority(a));
