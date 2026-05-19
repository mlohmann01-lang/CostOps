import type { ArbitrationCandidate } from './economic-arbitration-types'; import { computeEconomicArbitration } from './economic-arbitration-engine';
export const computeEconomicArbitrationReport=(input:ArbitrationCandidate[])=>({decision:computeEconomicArbitration(input),status:'ARBITRATION_FOUNDATION_READY' as const});
