import type { EconomicMemoryRecord } from './economic-memory-types';
export const evaluateGovernanceDrift=(input:EconomicMemoryRecord[])=>({approvalDelay:input.filter((x)=>!x.approved).length/Math.max(1,input.length),bypassRate:0});
