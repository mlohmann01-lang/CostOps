import type { AIRuntimeEconomicSignal } from './ai-runtime-economic-types';
export const evaluateAITrainingEconomics=(s:AIRuntimeEconomicSignal)=>({trainingCost:s.gpuHours*s.modelUnitCost,volatility:s.burstVolatility});
