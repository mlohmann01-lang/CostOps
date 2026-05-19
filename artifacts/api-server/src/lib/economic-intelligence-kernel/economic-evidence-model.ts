import type { EconomicEvidenceReference } from './economic-kernel-types';
export function normalizeEconomicEvidence(input:EconomicEvidenceReference[]):EconomicEvidenceReference[]{return [...input].filter((e)=>e.id&&e.source&&e.lineageId&&e.replayId).map((e)=>({...e,confidence:Math.max(0,Math.min(1,e.confidence))})).sort((a,b)=>a.id.localeCompare(b.id));}
