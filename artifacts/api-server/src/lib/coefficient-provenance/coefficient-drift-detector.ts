export const evaluateCoefficientDrift=(i:{baseline:number;current:number})=>({drift:Math.abs(i.current-i.baseline),conflicting:Math.abs(i.current-i.baseline)>0.2});
