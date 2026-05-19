export const evaluateApprovalBehaviorHistory=(i:{avgDelayDays:number})=>({realizationDelayImpact:i.avgDelayDays>7?"HIGH":"LOW",confidenceImpact:i.avgDelayDays/100});
