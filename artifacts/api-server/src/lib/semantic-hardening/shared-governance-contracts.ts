import type { EconomicGovernanceEnvelope } from './shared-economic-dtos';
export function assertGovernanceEnvelope(g:EconomicGovernanceEnvelope):void{ if(!g.classification||!g.rationale) throw new Error('Invalid governance envelope'); }
