import type { EconomicConfidenceInput, EconomicConfidenceResult, Score10 } from './economic-kernel-types';
const dims:(keyof Score10)[]=['dataCompleteness','dataFreshness','signalConsistency','ownershipClarity','costTraceability','usageSignalQuality','reversibility','policyFit','forecastStability','replayConfidence'];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function evaluateEconomicConfidence(input:EconomicConfidenceInput):EconomicConfidenceResult{const values=dims.map((d)=>clamp(input[d])); const score=Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(4)); return {domain:input.domain,score,lowConfidenceDimensions:dims.filter((d)=>clamp(input[d])<0.55)};}
