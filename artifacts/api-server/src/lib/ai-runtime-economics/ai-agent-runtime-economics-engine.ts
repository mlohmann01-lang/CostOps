import type { AIRuntimeEconomicSignal } from './ai-runtime-economic-types';
export const evaluateAIAgentRuntimeEconomics=(s:AIRuntimeEconomicSignal)=>({agentLoopCostGrowth:s.retryRate*s.requestVolume*s.modelUnitCost});
