import type { AIRuntimeEconomicSignal } from './ai-runtime-economic-types';
export const evaluateAIRuntimeVolatility=(s:AIRuntimeEconomicSignal)=>({score:(s.burstVolatility+s.retryRate+(1-s.cacheHitRate))/3});
