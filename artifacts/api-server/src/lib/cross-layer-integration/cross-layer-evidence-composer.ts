import type { EconomicEvidenceReference } from '../semantic-hardening';
export const composeCrossLayerEvidence=(input:EconomicEvidenceReference[][])=>input.flat().sort((a,b)=>a.id.localeCompare(b.id));
