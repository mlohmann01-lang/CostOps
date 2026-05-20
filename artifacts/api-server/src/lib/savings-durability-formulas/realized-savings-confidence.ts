export const computeRealizedSavingsConfidence=(i:{executionConfidence:number;evidenceConfidence:number})=>({confidence:Math.min(i.executionConfidence,i.evidenceConfidence)});
