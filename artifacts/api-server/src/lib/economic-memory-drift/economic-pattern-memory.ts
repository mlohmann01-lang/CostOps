import type { EconomicMemoryRecord } from './economic-memory-types'; import { detectEconomicRecurrence } from './economic-recurrence-detector';
export const computeEconomicPatternMemory=(input:EconomicMemoryRecord[])=>({patterns:detectEconomicRecurrence(input)});
