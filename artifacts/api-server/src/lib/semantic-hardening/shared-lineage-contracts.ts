import type { EconomicLineageReference } from './shared-economic-dtos';
export function assertLineageIntegrity(lineage:EconomicLineageReference):void{ if(!lineage.lineageId||!lineage.sourceSystem||!lineage.entityId) throw new Error('Invalid lineage'); }
