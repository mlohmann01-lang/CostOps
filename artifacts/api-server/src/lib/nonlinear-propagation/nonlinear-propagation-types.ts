export type CurveType = "step"|"linear"|"convex"|"capped"|"threshold"|"saturation";
export interface CurveResult { input:number; cost:number; curveType:CurveType; confidence:number; source:string; assumptions:string[]; coefficients:string[]; evidenceRefs:string[]; }
