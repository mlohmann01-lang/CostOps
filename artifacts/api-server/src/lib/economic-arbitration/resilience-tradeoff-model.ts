export const evaluateResilienceTradeoff=(x:{kubernetesSavings:number;resilienceRisk:number})=>({deferOptimization:x.resilienceRisk>0.65,effectiveSavings:x.resilienceRisk>0.65?0:x.kubernetesSavings});
