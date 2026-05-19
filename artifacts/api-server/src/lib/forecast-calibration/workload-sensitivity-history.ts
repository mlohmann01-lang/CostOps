export const evaluateWorkloadSensitivityHistory=(i:{volatility:number})=>({sensitivity:i.volatility,confidenceImpact:i.volatility>0.5?0.2:0.05});
