import { computeEvidenceWeightedConfidence } from "./evidence-weighted-confidence";
export const computeForecastConfidenceBounds=(i:any)=>{ const c=computeEvidenceWeightedConfidence(i).confidence; const s=i.variance*(1+(i.missingEvidenceCount??0)+(i.conflictCount??0)); return {lower:i.base-s,base:i.base,upper:i.base+s,confidence:c,assumptions:i.assumptions,evidenceRefs:i.evidenceRefs,coefficients:i.coefficients}; };
export const F = computeForecastConfidenceBounds;
