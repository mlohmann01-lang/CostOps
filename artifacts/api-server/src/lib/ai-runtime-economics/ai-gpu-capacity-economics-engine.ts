import type { AIRuntimeEconomicSignal } from './ai-runtime-economic-types';
export const evaluateAIGpuCapacityEconomics=(s:AIRuntimeEconomicSignal)=>({gpuIdleCost:s.idleCapacity*s.gpuHours*s.modelUnitCost,gpuFragmentationRisk:(1-s.batchability)*s.concurrency});
