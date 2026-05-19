export const evaluateConfidenceDecay=(base:number,failures:number)=>Math.max(0,Math.min(1,base-(failures*0.08)));
