import type { EconomicDriftEvent } from './economic-drift-types'; import type { EconomicMemoryRecord } from './economic-memory-types';
export function detectEconomicDrift(input:EconomicMemoryRecord[]):EconomicDriftEvent[]{const out:EconomicDriftEvent[]=[]; if(input.some((r)=>r.savingsDelta<0)) out.push('SAVINGS_DECAY'); if(input.some((r)=>!r.approved)) out.push('APPROVAL_DELAY'); return out;}
