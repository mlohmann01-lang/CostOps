import type { ArbitrationCandidate } from './economic-arbitration-types';
export const detectEconomicConflicts=(input:ArbitrationCandidate[])=>input.filter((x)=>x.governanceRisk>0.7||x.volatilityRisk>0.7).map((x)=>x.id);
