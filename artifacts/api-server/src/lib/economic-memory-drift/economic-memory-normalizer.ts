import type { EconomicMemoryRecord } from './economic-memory-types';
export const normalizeEconomicMemoryRecords=(input:EconomicMemoryRecord[])=>[...input].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
