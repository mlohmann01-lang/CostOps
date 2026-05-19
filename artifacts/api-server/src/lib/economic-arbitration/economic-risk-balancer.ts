import type { ArbitrationCandidate } from './economic-arbitration-types';
export const evaluateEconomicRiskBalance=(c:ArbitrationCandidate)=>c.governanceRisk>0.8?'BLOCKED':c.governanceRisk>0.6?'APPROVAL_REQUIRED':'RECOMMEND_ONLY';
