import type { EvidenceGrade } from "./coefficient-provenance-types"; const s={LOW:0.4,MODERATE:0.6,HIGH:0.8,VERIFIED:0.95}; export const evaluateEvidenceGrade=(g:EvidenceGrade)=>s[g];
