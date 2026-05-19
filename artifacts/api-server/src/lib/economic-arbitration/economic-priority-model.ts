import type { ArbitrationCandidate } from './economic-arbitration-types';
export const evaluateEconomicPriority=(input:ArbitrationCandidate)=>input.savings-(input.governanceRisk*100)-(input.volatilityRisk*50);
