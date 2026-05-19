import type { EconomicMemoryRecord } from './economic-memory-types';
export const evaluateSavingsDegradation=(input:EconomicMemoryRecord[])=>({degradation:Math.max(0,Math.min(1,Math.abs(input.reduce((a,x)=>a+Math.min(0,x.savingsDelta),0))/Math.max(1,input.length*100)))});
