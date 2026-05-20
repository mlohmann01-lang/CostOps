export const computeExecutionSuccessScore=(i:{approval:number;rollbackRisk:number})=>({likelihoodScore:Math.max(0,i.approval*(1-i.rollbackRisk))});
