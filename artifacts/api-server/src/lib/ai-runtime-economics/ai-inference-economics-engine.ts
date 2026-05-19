import type { AIRuntimeEconomicSignal } from './ai-runtime-economic-types';
export const evaluateAIInferenceEconomics=(s:AIRuntimeEconomicSignal)=>({inferenceCost:s.requestVolume*s.modelUnitCost,latencyPressure:s.latencySensitivity*s.concurrency});
