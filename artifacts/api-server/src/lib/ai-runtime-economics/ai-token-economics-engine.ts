import type { AIRuntimeEconomicSignal } from './ai-runtime-economic-types';
export const evaluateAITokenEconomics=(s:AIRuntimeEconomicSignal)=>({tokenCost:(s.promptTokenCost+s.completionTokenCost)*s.tokenVolume,retryPenalty:s.retryRate*(s.promptTokenCost+s.completionTokenCost)*s.tokenVolume});
