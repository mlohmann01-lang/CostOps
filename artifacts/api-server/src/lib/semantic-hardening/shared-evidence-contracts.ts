import type { EconomicEvidenceReference } from './shared-economic-dtos';
export function assertEvidenceIntegrity(e:EconomicEvidenceReference[]):void{ if(e.length===0) throw new Error('Evidence required'); e.forEach((x)=>{ if(!x.id||!x.source||!x.lineage.lineageId||!x.replay.replayId) throw new Error('Invalid evidence integrity'); }); }
