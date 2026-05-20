export const evaluateReplayCoefficientTuning=(i:{coefficient:number;drift:number})=>({suggestedCoefficient:i.coefficient*(1-Math.min(0.3,Math.abs(i.drift))),autoMutated:false});
