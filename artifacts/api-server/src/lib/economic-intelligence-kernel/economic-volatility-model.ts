import type { EconomicVolatilityInput, EconomicVolatilityResult } from './economic-kernel-types';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function evaluateEconomicVolatility(input:EconomicVolatilityInput):EconomicVolatilityResult{const score=Number(((clamp(input.volatility)+(1-clamp(input.forecastStability))+clamp(input.burstVolatility??input.volatility))/3).toFixed(4)); return {domain:input.domain,score,band:score>=0.66?'UNSTABLE':score>=0.33?'VARIABLE':'STABLE'};}
