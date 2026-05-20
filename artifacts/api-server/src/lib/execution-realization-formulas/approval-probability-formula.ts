export const computeApprovalProbability=(i:{fatigue:number;base:number})=>({likelihoodScore:Math.max(0,i.base-i.fatigue)});
