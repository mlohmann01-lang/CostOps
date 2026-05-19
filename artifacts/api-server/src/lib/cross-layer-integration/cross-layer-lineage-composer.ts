import type { EconomicLineageReference } from '../semantic-hardening';
export const composeCrossLayerLineage=(input:EconomicLineageReference[])=>[...input].sort((a,b)=>a.lineageId.localeCompare(b.lineageId));
