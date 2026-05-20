export const computePartialRealization=(i:{savings:number;executionRatio:number;approvalBlocked?:boolean})=>({realizedSavings:i.approvalBlocked?0:i.savings*i.executionRatio});
