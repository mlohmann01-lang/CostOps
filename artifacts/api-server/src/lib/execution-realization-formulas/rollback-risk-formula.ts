export const computeRollbackRiskScore=(i:{failureRate:number})=>({likelihoodScore:Math.min(1,Math.max(0,i.failureRate))});
